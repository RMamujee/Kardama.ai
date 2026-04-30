import { getCleaners } from '@/lib/data'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ChatListener } from './ChatListener'

export async function ChatListenerProvider() {
  const [cleaners, supabase] = await Promise.all([getCleaners(), createSupabaseServerClient()])

  const { data: unread } = await supabase
    .from('messages')
    .select('cleaner_id, content, created_at')
    .eq('sender_role', 'cleaner')
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  const cleanerMap = new Map(cleaners.map(c => [c.id, c.name]))
  const initialNotifications = (unread ?? [])
    .filter(r => cleanerMap.has(r.cleaner_id))
    .map(r => ({
      cleanerId: r.cleaner_id,
      cleanerName: cleanerMap.get(r.cleaner_id)!,
      message: r.content,
      time: r.created_at,
    }))

  return (
    <ChatListener
      cleaners={cleaners.map(c => ({ id: c.id, name: c.name }))}
      initialNotifications={initialNotifications}
    />
  )
}
