import 'server-only'
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions'
import { getSupabaseAdminClient } from '../supabase/admin'
import { getOpenAI, OPENAI_MODEL } from './openai-client'
import { TOOL_SCHEMAS, SOCIAL_TOOL_NAMES, runTool, type ToolContext } from './tools'
import { buildSystemPrompt } from './system-prompt'
import { sendByChannel, type Channel } from './transports'

const MAX_TOOL_ITERATIONS = 6
const HISTORY_MESSAGE_LIMIT = 30

type ConversationRow = {
  id: string
  customer_phone: string | null
  customer_id: string | null
  channel: Channel
  external_user_id: string | null
  external_user_handle: string | null
  mode: 'auto' | 'human' | 'escalated'
  human_takeover_at: string | null
}

type MessageRow = {
  direction: 'inbound' | 'outbound'
  sender: 'customer' | 'ai' | 'owner'
  body: string
  created_at: string
}

// Main entry point. The webhook calls this fire-and-forget after persisting
// the inbound message. We re-fetch the conversation here (rather than trust
// what the webhook saw) because the owner may have flipped to human mode
// between the webhook responding and this function actually running.
export async function respondToMessage(conversationId: string): Promise<void> {
  const admin = getSupabaseAdminClient()

  const { data: conv } = await admin
    .from('sms_conversations')
    .select('id, customer_phone, customer_id, channel, external_user_id, external_user_handle, mode, human_takeover_at')
    .eq('id', conversationId)
    .maybeSingle<ConversationRow>()

  if (!conv) {
    console.warn(`[ai-agent] conversation ${conversationId} not found`)
    return
  }

  // Owner is handling it (or already escalated). AI stays silent.
  if (conv.mode !== 'auto') {
    console.log(`[ai-agent] skip dispatch — conversation ${conversationId} mode=${conv.mode}`)
    return
  }

  // Honor a 30-minute cooldown after the owner manually replied. This lets
  // the owner finish a thread before the AI jumps back in.
  if (conv.human_takeover_at) {
    const cooldownEndsAt = new Date(conv.human_takeover_at).getTime() + 30 * 60 * 1000
    if (Date.now() < cooldownEndsAt) {
      console.log(`[ai-agent] human cooldown active on ${conversationId}, skipping`)
      return
    }
  }

  const messages = await loadHistory(admin, conversationId)
  const customerName = (await resolveCustomerName(admin, conv.customer_id)) ?? conv.external_user_handle ?? undefined

  const channel = conv.channel ?? 'sms'

  const ctx: ToolContext = {
    conversationId: conv.id,
    customerPhone: conv.customer_phone ?? '',
    channel,
  }

  const reply = await runAgent(
    {
      channel,
      customerKnown: Boolean(conv.customer_id),
      customerName,
    },
    messages,
    ctx,
  )

  if (!reply.text) {
    console.warn(`[ai-agent] no text reply produced for ${conversationId}`)
    return
  }

  const recipient =
    channel === 'sms' ? (conv.customer_phone ?? '') : (conv.external_user_id ?? '')
  if (!recipient) {
    console.error(`[ai-agent] no recipient for conversation ${conversationId} on channel ${channel}`)
    return
  }

  await sendAndPersist(channel, recipient, conv.id, reply.text, reply.toolCalls)
}

async function loadHistory(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  conversationId: string,
): Promise<ChatCompletionMessageParam[]> {
  const { data } = await admin
    .from('sms_messages')
    .select('direction, sender, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_MESSAGE_LIMIT)

  const rows = ((data as MessageRow[]) ?? []).slice().reverse()
  return rows.map((m): ChatCompletionMessageParam => {
    if (m.direction === 'inbound') return { role: 'user', content: m.body }
    // Both AI and owner outbound show up as 'assistant' so the model sees a
    // unified conversation history. Prefix owner messages so the AI
    // understands a human took over earlier turns.
    if (m.sender === 'owner') return { role: 'assistant', content: `[Owner manual reply] ${m.body}` }
    return { role: 'assistant', content: m.body }
  })
}

async function resolveCustomerName(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  customerId: string | null,
): Promise<string | undefined> {
  if (!customerId) return undefined
  const { data } = await admin
    .from('customers')
    .select('name')
    .eq('id', customerId)
    .maybeSingle()
  return data?.name as string | undefined
}

interface AgentReply {
  text: string | null
  toolCalls: { name: string; args: unknown; result: unknown }[]
}

async function runAgent(
  promptOpts: { channel: Channel; customerKnown: boolean; customerName?: string },
  history: ChatCompletionMessageParam[],
  ctx: ToolContext,
): Promise<AgentReply> {
  const client = getOpenAI()
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(promptOpts) },
    ...history,
  ]
  const auditTrail: AgentReply['toolCalls'] = []

  const tools = promptOpts.channel === 'sms'
    ? TOOL_SCHEMAS
    : TOOL_SCHEMAS.filter((t) => SOCIAL_TOOL_NAMES.has(t.function.name))

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.4,
    })

    const choice = completion.choices[0]
    if (!choice) break
    const msg = choice.message

    // No tool calls — we have the final reply text.
    if (!msg.tool_calls?.length) {
      return { text: msg.content ?? null, toolCalls: auditTrail }
    }

    // Re-add the assistant message (with tool_calls) so the API has the
    // matching tool_call_id when we reply with tool results.
    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    })

    for (const call of msg.tool_calls as ChatCompletionMessageToolCall[]) {
      if (call.type !== 'function') continue
      const name = call.function.name
      const argsRaw = call.function.arguments
      const resultStr = await runTool(name, argsRaw, ctx)

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: resultStr,
      })

      try {
        auditTrail.push({
          name,
          args: argsRaw ? JSON.parse(argsRaw) : {},
          result: JSON.parse(resultStr),
        })
      } catch {
        auditTrail.push({ name, args: argsRaw, result: resultStr })
      }

      // If the agent escalated, stop the loop after this iteration completes
      // and let it produce one short acknowledgement message.
      if (name === 'escalate_to_owner') {
        const finalCompletion = await client.chat.completions.create({
          model: OPENAI_MODEL,
          messages,
          tool_choice: 'none',
          temperature: 0.4,
        })
        return {
          text: finalCompletion.choices[0]?.message?.content ?? null,
          toolCalls: auditTrail,
        }
      }
    }
  }

  // Hit the iteration cap. Force a final text reply with no more tools.
  const final = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    tool_choice: 'none',
    temperature: 0.4,
  })
  return { text: final.choices[0]?.message?.content ?? null, toolCalls: auditTrail }
}

// Send the reply via the right transport (Twilio / Messenger / Instagram)
// + persist the outbound row directly. For SMS we bypass /api/sms/send
// because that route enforces "recipient must be a known customer" —
// cold inbound DMs / texts don't have a customer yet, and the AI still
// needs to reply.
async function sendAndPersist(
  channel: Channel,
  recipient: string,
  conversationId: string,
  body: string,
  toolCalls: AgentReply['toolCalls'],
): Promise<void> {
  if (!body.trim()) return

  const trimmed = channel === 'sms' ? body.slice(0, 480) : body
  let providerMessageId: string | null = null
  let twilioSid: string | null = null
  try {
    const result = await sendByChannel({ channel, recipient, body: trimmed })
    providerMessageId = result.providerId
    twilioSid = result.twilioSid
  } catch (err) {
    console.error(`[ai-agent] ${channel} send failed`, err)
    // Persist anyway so the owner sees what the AI tried to say.
  }

  const admin = getSupabaseAdminClient()
  const { error } = await admin.from('sms_messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    sender: 'ai',
    body: trimmed,
    twilio_sid: twilioSid,
    provider_message_id: providerMessageId,
    ai_tools_used: toolCalls.length ? toolCalls : null,
  })
  if (error) console.error('[ai-agent] persist outbound failed', error)
}
