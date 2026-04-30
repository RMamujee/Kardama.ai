import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getAllMessages } from '@/lib/data'
import { ChatsClient } from './chats-client'

export default async function ChatsPage() {
  await requireOwner()
  const [cleaners, messages] = await Promise.all([
    getCleaners(),
    getAllMessages(),
  ])
  return <ChatsClient cleaners={cleaners} initialMessages={messages} />
}
