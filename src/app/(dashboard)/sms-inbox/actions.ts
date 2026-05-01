'use server'
import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/supabase/dal'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/twilio'
import { sendByChannel } from '@/lib/ai-agent/transports'

// Owner takes a thread away from the AI. AI sees this in respondToMessage()
// and stays silent. The 30-minute cooldown also applies to escalated mode.
export async function takeOverConversation(conversationId: string) {
  await requireOwner()
  const admin = getSupabaseAdminClient()
  const { error } = await admin
    .from('sms_conversations')
    .update({ mode: 'human', human_takeover_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw error
  revalidatePath('/sms-inbox')
}

// Owner hands the conversation back to the AI. Resets the cooldown.
export async function handBackToAi(conversationId: string) {
  await requireOwner()
  const admin = getSupabaseAdminClient()
  const { error } = await admin
    .from('sms_conversations')
    .update({ mode: 'auto', human_takeover_at: null, escalation_reason: null })
    .eq('id', conversationId)
  if (error) throw error
  revalidatePath('/sms-inbox')
}

// Clear the unread badge when the owner opens a thread.
export async function markConversationRead(conversationId: string) {
  await requireOwner()
  const admin = getSupabaseAdminClient()
  const { error } = await admin
    .from('sms_conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId)
  if (error) throw error
}

// Send a manual reply from the owner. Bypasses /api/sms/send because that
// route requires the recipient to be a known customer — for cold inbound
// threads, the customer doesn't exist yet but the owner still needs to reply.
// Also flips the thread to human mode so the AI doesn't talk over the owner.
// Dispatches via the right transport based on conversation.channel.
export async function sendOwnerReply(conversationId: string, body: string) {
  await requireOwner()
  if (!body.trim()) throw new Error('empty message')

  const admin = getSupabaseAdminClient()
  const { data: conv } = await admin
    .from('sms_conversations')
    .select('channel, customer_phone, external_user_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (!conv) throw new Error('conversation not found')

  const channel = (conv.channel ?? 'sms') as 'sms' | 'messenger' | 'instagram'
  let recipient = ''
  if (channel === 'sms') {
    if (!conv.customer_phone) throw new Error('no phone on SMS conversation')
    const phone = toE164(conv.customer_phone)
    if (!phone) throw new Error('invalid phone on conversation')
    recipient = phone
  } else {
    if (!conv.external_user_id) throw new Error(`no external_user_id on ${channel} conversation`)
    recipient = conv.external_user_id
  }

  const trimmed = channel === 'sms' ? body.trim().slice(0, 480) : body.trim().slice(0, 2000)

  let twilioSid: string | null = null
  let providerMessageId: string | null = null
  try {
    const result = await sendByChannel({ channel, recipient, body: trimmed })
    twilioSid = result.twilioSid
    providerMessageId = result.providerId
  } catch (err) {
    console.error(`[sms-inbox] ${channel} send failed`, err)
    throw new Error(`${channel} send failed`)
  }

  await admin.from('sms_messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    sender: 'owner',
    body: trimmed,
    twilio_sid: twilioSid,
    provider_message_id: providerMessageId,
  })

  // Sending counts as a take-over. Future AI replies on this thread are
  // suppressed for the next 30 minutes unless the owner explicitly hands back.
  await admin
    .from('sms_conversations')
    .update({ mode: 'human', human_takeover_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath('/sms-inbox')
}
