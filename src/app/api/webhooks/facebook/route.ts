import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { waitUntil } from '@vercel/functions'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { respondToMessage } from '@/lib/ai-agent'
import { sendOwnerPush } from '@/lib/owner-push'

// Meta webhook for Facebook Messenger + Instagram DMs.
// Both flow through the same Meta App, so we accept either object='page'
// (Messenger) or object='instagram' (IG Direct) at this URL.
//
// Required env vars:
//   FB_VERIFY_TOKEN       — any string you choose; enter it in the Meta App
//                           dashboard when registering the webhook URL
//   FB_PAGE_ACCESS_TOKEN  — long-lived Page Access Token from the Meta App
//                           dashboard. The same token works for IG DMs once
//                           your IG Business account is connected to the Page.
//   FB_APP_SECRET         — App Secret from the Meta App dashboard. Used to
//                           verify x-hub-signature-256 on inbound events.
//
// Setup (one-time, in Meta App dashboard):
//   1. Add Messenger product. Connect your Facebook Page.
//   2. (For IG) Connect your Instagram Business account to that Page.
//   3. Generate a Page Access Token, save as FB_PAGE_ACCESS_TOKEN.
//   4. Webhook → Subscribe to fields: messages, messaging_postbacks
//      (for Messenger) AND messages (for Instagram).
//   5. Webhook callback URL: https://kardama-ai.vercel.app/api/webhooks/facebook
//      Verify token: whatever you set FB_VERIFY_TOKEN to.

type Channel = 'messenger' | 'instagram'

function verifySignature(rawBody: string, signature: string, appSecret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// GET — Meta webhook verification handshake (works for FB and IG)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    console.log('[meta/webhook] verification successful')
    return new Response(challenge ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.warn('[meta/webhook] verification failed — token mismatch or wrong mode')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

interface MetaMessagingEvent {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: { mid?: string; text?: string; is_echo?: boolean }
  postback?: { title?: string; payload?: string }
}

interface MetaWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    time: number
    messaging?: MetaMessagingEvent[]
  }>
}

// POST — incoming Messenger/IG events
export async function POST(request: Request) {
  const rawBody = await request.text()

  const appSecret = process.env.FB_APP_SECRET
  if (appSecret) {
    const sig = request.headers.get('x-hub-signature-256') ?? ''
    if (!sig || !verifySignature(rawBody, sig, appSecret)) {
      console.warn('[meta/webhook] signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  let body: MetaWebhookPayload
  try {
    body = JSON.parse(rawBody) as MetaWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let channel: Channel | null = null
  if (body.object === 'page') channel = 'messenger'
  else if (body.object === 'instagram') channel = 'instagram'
  else {
    return NextResponse.json({ status: 'ignored', object: body.object })
  }

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      // Skip echoes of messages we sent
      if (event.message?.is_echo) continue

      const senderId = event.sender?.id
      const text = event.message?.text?.trim() ?? ''
      const messageId = event.message?.mid ?? null
      if (!senderId || !text) continue

      try {
        const conversationId = await persistInbound(channel, senderId, text, messageId, event)
        if (!conversationId) continue

        // Fire-and-forget the AI dispatch so we return 200 OK to Meta fast.
        // respondToMessage re-checks conversation.mode to skip dispatch on
        // human/escalated threads.
        waitUntil(
          respondToMessage(conversationId).catch((err) =>
            console.error(`[meta/webhook] ai dispatch failed (${channel})`, err)
          )
        )
        waitUntil(
          pushOnInboundIfOwnerHandled(conversationId, channel, senderId, text).catch((err) =>
            console.error('[meta/webhook] owner push failed', err)
          )
        )
      } catch (err) {
        console.error(`[meta/webhook] persist failed (${channel})`, err)
      }
    }
  }

  // Always return 200 so Meta doesn't retry
  return NextResponse.json({ status: 'ok' })
}

async function persistInbound(
  channel: Channel,
  senderId: string,
  body: string,
  providerMessageId: string | null,
  rawEvent: MetaMessagingEvent,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient()

  // 1. Find or create the conversation by (channel, external_user_id).
  const { data: existing } = await supabase
    .from('sms_conversations')
    .select('id')
    .eq('channel', channel)
    .eq('external_user_id', senderId)
    .maybeSingle()

  let conversationId = existing?.id as string | undefined

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from('sms_conversations')
      .insert({
        channel,
        external_user_id: senderId,
        customer_phone: null,
      })
      .select('id')
      .single()
    if (error || !created) {
      console.error(`[meta/webhook] insert sms_conversations failed (${channel})`, error)
      return null
    }
    conversationId = created.id as string
  }

  // 2. Append the inbound message. The trigger bumps last_message_at and
  //    increments unread_count. provider_message_id (FB mid) prevents
  //    duplicate inserts if Meta retries.
  if (providerMessageId) {
    const { data: dup } = await supabase
      .from('sms_messages')
      .select('id')
      .eq('provider_message_id', providerMessageId)
      .maybeSingle()
    if (dup) return conversationId
  }

  const { error: msgErr } = await supabase
    .from('sms_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'inbound',
      sender: 'customer',
      body,
      provider_message_id: providerMessageId,
    })
  if (msgErr) {
    console.error(`[meta/webhook] insert sms_messages failed (${channel})`, msgErr)
    return null
  }

  // 3. Also drop a row in social_leads so the lead monitor surfaces the
  //    inbound DM, same as the legacy Messenger handler did. Best-effort.
  await supabase.from('social_leads').upsert(
    {
      platform: channel === 'messenger' ? ('messenger' as const) : ('instagram' as const),
      author: channel === 'messenger' ? 'Messenger User' : 'Instagram User',
      author_initials: channel === 'messenger' ? 'FB' : 'IG',
      group_or_page: channel === 'messenger' ? 'Facebook Messenger' : 'Instagram DM',
      content: body,
      posted_at: new Date(rawEvent.timestamp ?? Date.now()).toISOString(),
      status: 'new' as const,
      location: '',
      urgency: 'medium' as const,
      likes: 0,
      comments_count: 0,
      responded_at: null,
      response_used: null,
      captured_at: null,
      messenger_psid: channel === 'messenger' ? senderId : null,
      external_id: providerMessageId,
      raw_data: rawEvent as object,
    },
    { onConflict: 'external_id', ignoreDuplicates: true }
  )

  return conversationId
}

async function pushOnInboundIfOwnerHandled(
  conversationId: string,
  channel: Channel,
  senderId: string,
  body: string,
) {
  const supabase = getSupabaseAdminClient()
  const { data: conv } = await supabase
    .from('sms_conversations')
    .select('mode, external_user_handle')
    .eq('id', conversationId)
    .maybeSingle()
  if (!conv || conv.mode === 'auto') return

  const channelLabel = channel === 'messenger' ? 'FB Messenger' : 'Instagram DM'
  const title = `${channelLabel} from ${conv.external_user_handle ?? senderId.slice(0, 8)}`
  await sendOwnerPush({
    title,
    body: body.slice(0, 140),
    url: `/sms-inbox?id=${conversationId}`,
    tag: `inbound-${conversationId}`,
  })
}
