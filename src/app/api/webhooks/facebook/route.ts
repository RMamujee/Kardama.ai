import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Facebook Messenger webhook for the cleaning company's Facebook Page.
//
// Required env vars:
//   FB_VERIFY_TOKEN      — any string you choose; enter it in the Facebook App dashboard
//                          when registering the webhook URL
//   FB_PAGE_ACCESS_TOKEN — long-lived Page Access Token from the Facebook App dashboard
//                          (Page → Settings → Advanced → Page Access Token, or via Graph API Explorer)
//   FB_APP_SECRET        — App Secret from the Facebook App dashboard (used to verify
//                          request signatures)
//   FB_AUTO_REPLY        — set to "true" to automatically reply to cleaning inquiries
//
// Setup steps (one-time):
//   1. Create a Facebook App at developers.facebook.com → Messenger product
//   2. Connect it to your cleaning company's Facebook Page
//   3. Generate a Page Access Token and save as FB_PAGE_ACCESS_TOKEN
//   4. In Messenger Settings → Webhooks: subscribe to "messages" and "messaging_postbacks"
//      with the URL https://kardama.ai/api/webhooks/facebook
//   5. Set FB_VERIFY_TOKEN to any secret string — same value you enter in the webhook form

const CLEANING_KEYWORDS = [
  'clean', 'cleaning', 'cleaner', 'maid', 'housekeeper', 'housekeeping',
  'tidy', 'scrub', 'sanitize', 'disinfect', 'spotless',
]

const AUTO_REPLY_MESSAGE = `Hi there! Thanks for reaching out to Kardama Clean 🏠✨

We're a local, fully insured cleaning team serving Long Beach, Torrance, El Segundo, and the South Bay area.

✅ Bonded & insured
✅ Background-checked cleaners
✅ Teams of 2 for faster service
✅ Same-day/next-day availability

Could you share your home size and when you'd like to schedule? We'll get you a quick quote! 😊`

function mentionsCleaning(text: string): boolean {
  const lower = text.toLowerCase()
  return CLEANING_KEYWORDS.some(kw => lower.includes(kw))
}

function detectUrgency(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()
  const high = ['asap', 'urgent', 'today', 'tonight', 'immediately', 'this week', 'last minute']
  const medium = ['next week', 'soon', 'this month']
  if (high.some(kw => lower.includes(kw))) return 'high'
  if (medium.some(kw => lower.includes(kw))) return 'medium'
  return 'medium'
}

function verifySignature(rawBody: string, signature: string, appSecret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

async function sendReply(psid: string, text: string): Promise<void> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!token) return

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/me/messages?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: psid },
          message: { text },
          messaging_type: 'RESPONSE',
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[fb/webhook] send reply failed:', res.status, err.slice(0, 200))
    }
  } catch (err) {
    console.error('[fb/webhook] send reply error:', err)
  }
}

// GET — Facebook webhook verification handshake
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    console.log('[fb/webhook] verification successful')
    return new Response(challenge ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.warn('[fb/webhook] verification failed — token mismatch or wrong mode')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — incoming Messenger events
export async function POST(request: Request) {
  const rawBody = await request.text()

  // Verify request signature when FB_APP_SECRET is set
  const appSecret = process.env.FB_APP_SECRET
  if (appSecret) {
    const sig = request.headers.get('x-hub-signature-256') ?? ''
    if (!sig || !verifySignature(rawBody, sig, appSecret)) {
      console.warn('[fb/webhook] signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  let body: {
    object: string
    entry?: Array<{
      id: string
      time: number
      messaging?: Array<{
        sender: { id: string }
        recipient: { id: string }
        timestamp: number
        message?: { mid: string; text?: string; is_echo?: boolean }
        postback?: { title: string; payload: string }
      }>
    }>
  }

  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Facebook requires 200 OK within 20s or it retries
  if (body.object !== 'page') {
    return NextResponse.json({ status: 'not-page' })
  }

  const db = getSupabaseAdminClient()
  const autoReply = process.env.FB_AUTO_REPLY === 'true'

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      // Skip echo events (messages we sent)
      if (event.message?.is_echo) continue

      const psid = event.sender?.id
      const text = event.message?.text?.trim() ?? ''
      if (!psid || !text) continue

      const isCleaning = mentionsCleaning(text)

      // Persist every DM as a lead — owner reviews in the Lead Monitor
      await db.from('social_leads').upsert(
        {
          platform: 'messenger' as const,
          author: 'Messenger User',
          author_initials: 'FB',
          group_or_page: 'Facebook Messenger',
          content: text,
          posted_at: new Date(event.timestamp).toISOString(),
          status: 'new' as const,
          location: 'Los Angeles, CA',
          urgency: isCleaning ? detectUrgency(text) : ('low' as const),
          likes: 0,
          comments_count: 0,
          responded_at: null,
          response_used: null,
          captured_at: null,
          messenger_psid: psid,
          external_id: event.message?.mid ?? null,
          raw_data: event as object,
        },
        { onConflict: 'external_id', ignoreDuplicates: true }
      )

      if (autoReply && isCleaning) {
        await sendReply(psid, AUTO_REPLY_MESSAGE)
      }
    }
  }

  // Always return 200 so Facebook doesn't retry
  return NextResponse.json({ status: 'ok' })
}
