import { getCleaners } from '@/lib/data'
import { ChatListener } from './ChatListener'

export async function ChatListenerProvider() {
  const cleaners = await getCleaners()
  return <ChatListener cleaners={cleaners.map(c => ({ id: c.id, name: c.name }))} />
}
