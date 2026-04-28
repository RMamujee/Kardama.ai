import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners } from '@/lib/data'
import { ChatsClient } from './chats-client'

export default async function ChatsPage() {
  await requireOwner()
  const cleaners = await getCleaners()
  return <ChatsClient cleaners={cleaners} />
}
