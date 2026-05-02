import { NextResponse } from 'next/server'
import { sendSms, toE164 } from '@/lib/twilio'
import { getCustomers } from '@/lib/data'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { flag } from '@/lib/flags'

type SmsSender = 'owner' | 'ai'

// Owner-initiated outbound SMS from the dashboard. Also reused by the AI
// dispatcher when it auto-replies — pass `sender: 'ai'` and the agent's
// tool-call audit trail in `aiToolsUsed` so the inbox UI can show what the
// agent actually did.
export async function POST(request: Request) {
  if (!(await flag('smsSendingEnabled'))) {
    return NextResponse.json({ error: 'SMS sending temporarily disabled' }, { status: 503 })
  }

  const payload = await request.json() as {
    to?: string
    body?: string
    sender?: SmsSender
    aiToolsUsed?: unknown
  }
  const { to, body, sender = 'owner', aiToolsUsed } = payload

  if (!to || !body) {
    return NextResponse.json({ error: 'Missing required fields: to, body' }, { status: 400 })
  }

  if (body.length > 480) {
    return NextResponse.json({ error: 'Message body too long' }, { status: 400 })
  }

  // Restrict recipients to known customers — prevents use as an open SMS relay (CRIT-1)
  const e164 = toE164(to)
  const customers = await getCustomers()
  if (!e164 || !customers.some(c => toE164(c.phone) === e164)) {
    return NextResponse.json({ error: 'Recipient not permitted' }, { status: 403 })
  }

  let sid: string
  try {
    const result = await sendSms(to, body)
    sid = result.sid
  } catch (err) {
    console.error('[sms/send]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })  // MED-5
  }

  // Persist to the conversation log. Failure here doesn't fail the request —
  // the SMS already went out — but we surface it in the response so the
  // dashboard can flag desync.
  let persisted = false
  try {
    await persistOutbound(e164, body, sid, sender, aiToolsUsed)
    persisted = true
  } catch (err) {
    console.error('[sms/send] persist failed', err)
  }

  return NextResponse.json({ success: true, sid, persisted })
}

async function persistOutbound(
  phone: string,
  body: string,
  twilioSid: string,
  sender: SmsSender,
  aiToolsUsed: unknown,
) {
  const supabase = getSupabaseAdminClient()

  const { data: existing } = await supabase
    .from('sms_conversations')
    .select('id')
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
  }

  const { error } = await supabase
    .from('sms_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'outbound',
      sender,
      body,
      twilio_sid: twilioSid,
      ai_tools_used: aiToolsUsed ?? null,
    })
  if (error) throw error
}

async function resolveCustomerId(e164: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient()
  const { data } = await supabase.from('customers').select('id, phone')
  if (!data) return null
  const match = data.find((c) => toE164(c.phone) === e164)
  return match?.id ?? null
}

export const maxDuration = 30
