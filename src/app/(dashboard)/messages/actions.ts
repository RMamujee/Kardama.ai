'use server'

import { requireOwner } from '@/lib/supabase/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function sendOwnerMessage(cleanerId: string, content: string): Promise<void> {
  await requireOwner()
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 2000) return
  const supabase = await createSupabaseServerClient()
  await supabase.from('messages').insert({
    cleaner_id: cleanerId,
    sender_role: 'owner',
    content: trimmed,
  })
}

export async function markCleanerMessagesRead(cleanerId: string): Promise<void> {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('cleaner_id', cleanerId)
    .eq('sender_role', 'cleaner')
    .is('read_at', null)
}
