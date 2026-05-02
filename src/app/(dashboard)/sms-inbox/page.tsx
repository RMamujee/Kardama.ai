import { requireOwner } from '@/lib/supabase/dal'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { SmsInboxClient, type ConversationSummary } from './sms-inbox-client'

export const dynamic = 'force-dynamic'

export default async function SmsInboxPage() {
  await requireOwner()
  const admin = getSupabaseAdminClient()

  // Pull conversations + their last inbound preview + linked customer name in
  // a single round-trip per query. We don't try to do this in one SQL because
  // Supabase's PostgREST embed isn't great at "latest child" queries.
  const [{ data: conversations }, { data: customers }] = await Promise.all([
    admin
      .from('sms_conversations')
      .select('id, customer_phone, customer_id, mode, escalation_reason, last_message_at, unread_count, created_at')
      .order('last_message_at', { ascending: false })
      .limit(200),
    admin.from('customers').select('id, name, address, city, total_spent'),
  ])

  const customerMap = new Map((customers ?? []).map((c) => [c.id as string, c]))

  // For each conversation, grab the most recent message body for the preview.
  const previews: Record<string, string> = {}
  if (conversations?.length) {
    const ids = conversations.map((c) => c.id as string)
    const { data: lastMessages } = await admin
      .from('sms_messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
    if (lastMessages) {
      for (const m of lastMessages) {
        const cid = m.conversation_id as string
        if (!(cid in previews)) previews[cid] = m.body as string
      }
    }
  }

  const summaries: ConversationSummary[] = (conversations ?? []).map((c) => {
    const customer = c.customer_id ? customerMap.get(c.customer_id as string) : null
    return {
      id: c.id as string,
      customerPhone: c.customer_phone as string,
      customerId: (c.customer_id as string | null) ?? null,
      customerName: (customer?.name as string | undefined) ?? null,
      customerAddress: (customer?.address as string | undefined) ?? null,
      customerCity: (customer?.city as string | undefined) ?? null,
      customerTotalSpent: customer?.total_spent ? Number(customer.total_spent) : 0,
      mode: c.mode as ConversationSummary['mode'],
      escalationReason: (c.escalation_reason as string | null) ?? null,
      lastMessageAt: c.last_message_at as string,
      unreadCount: (c.unread_count as number) ?? 0,
      lastMessagePreview: previews[c.id as string] ?? '',
    }
  })

  return <SmsInboxClient initialConversations={summaries} />
}
