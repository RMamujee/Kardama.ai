import { validateRequest } from 'twilio'
import { waitUntil } from '@vercel/functions'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/twilio'
import { respondToMessage } from '@/lib/ai-agent'
import { sendOwnerPush } from '@/lib/owner-push'

// Inbound SMS webhook. Twilio POSTs here with form-encoded params.
// We validate the signature, normalize the sender phone to E.164, persist
// the message into sms_conversations + sms_messages, then return an empty
// TwiML response. AI dispatch runs out-of-band (see step 5) so this stays
// well under Twilio's 15-second webhook timeout.
export async function POST(request: Request) {
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL

  if (!authToken || !webhookUrl) {
    return new Response('Service unavailable', { status: 503 })
  }

  const text   = await request.text()
  const params = Object.fromEntries(new URLSearchParams(text))
  const signature = request.headers.get('x-twilio-signature') ?? ''

  if (!validateRequest(authToken, signature, webhookUrl, params)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { From, Body, MessageSid } = params
  const phone = From ? toE164(From) : null

  if (!phone || !Body) {
    return twiml()
  }

  const masked = phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
  console.log(`[twilio] inbound SMS from ${masked} (${Body.length} chars, sid=${MessageSid ?? '?'})`)

  let conversationId: string | null = null
  try {
    conversationId = await persistInbound(phone, Body, MessageSid)
  } catch (err) {
    // Persistence failure should not 5xx Twilio (it would retry forever);
    // log and acknowledge.
    console.error('[twilio] persist failed', err)
  }

  // AI dispatch + (when the owner is the one handling this thread) a push
  // alert to their phone. Both run out-of-band so Twilio gets its TwiML
  // response in <1s. respondToMessage re-checks conversation.mode and skips
  // dispatch on human/escalated threads, while pushOnInbound only fires
  // when the owner has taken over so we don't spam them during AI flow.
  if (conversationId) {
    waitUntil(
      respondToMessage(conversationId).catch((err) =>
        console.error('[twilio] ai dispatch failed', err)
      )
    )
    waitUntil(
      pushOnInboundIfOwnerHandled(conversationId, phone, Body).catch((err) =>
        console.error('[twilio] owner push failed', err)
      )
    )
  }

  return twiml()
}

async function pushOnInboundIfOwnerHandled(conversationId: string, phone: string, body: string) {
  const supabase = getSupabaseAdminClient()
  const { data: conv } = await supabase
    .from('sms_conversations')
    .select('mode, customer_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (!conv || conv.mode === 'auto') return

  let name: string | null = null
  if (conv.customer_id) {
    const { data: c } = await supabase.from('customers').select('name').eq('id', conv.customer_id).maybeSingle()
    name = (c as { name?: string } | null)?.name ?? null
  }
  await sendOwnerPush({
    title: name ?? phone,
    body: body.slice(0, 140),
    url: `/sms-inbox?id=${conversationId}`,
    tag: `inbound-${conversationId}`,
  })
}

function twiml() {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

async function persistInbound(phone: string, body: string, twilioSid: string | undefined): Promise<string> {
  const supabase = getSupabaseAdminClient()

  // 1. Find or create the conversation. customer_id is best-effort: if we
  //    have a customer with this phone, link it; otherwise leave null and
  //    let the AI agent gather their info during the conversation.
  const { data: existing } = await supabase
    .from('sms_conversations')
    .select('id, customer_id')
    .eq('customer_phone', phone)
    .maybeSingle()

  let conversationId = existing?.id

  if (!conversationId) {
    const customerId = await resolveCustomerId(phone)
    const { data: created, error } = await supabase
      .from('sms_conversations')
      .insert({ customer_phone: phone, customer_id: customerId })
      .select('id')
      .single()
    if (error || !created) throw error ?? new Error('insert sms_conversations failed')
    conversationId = created.id
  } else if (!existing?.customer_id) {
    // Conversation exists but wasn't linked to a customer yet. Try again —
    // the customer may have signed up between texts.
    const customerId = await resolveCustomerId(phone)
    if (customerId) {
      await supabase
        .from('sms_conversations')
        .update({ customer_id: customerId })
        .eq('id', conversationId)
    }
  }

  // 2. Append the inbound message. The trigger bumps last_message_at and
  //    increments unread_count.
  const { error: msgErr } = await supabase
    .from('sms_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'inbound',
      sender: 'customer',
      body,
      twilio_sid: twilioSid ?? null,
    })
  if (msgErr) throw msgErr

  return conversationId
}

// Match an inbound number to an existing customer. Customer phones are not
// guaranteed to be E.164 in the DB, so normalize on the comparison side.
async function resolveCustomerId(e164: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient()
  const { data } = await supabase
    .from('customers')
    .select('id, phone')
  if (!data) return null
  const match = data.find((c) => toE164(c.phone) === e164)
  return match?.id ?? null
}
