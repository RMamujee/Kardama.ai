'use server'

import { requireOwner } from '@/lib/supabase/dal'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function sendMessageToCleaner(cleanerId: string, content: string) {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('messages')
    .insert({ cleaner_id: cleanerId, sender_role: 'owner', content: content.trim() })
    .select()
    .single()

  if (error) throw error

  // Fire push notification — non-blocking
  sendPush(cleanerId, content.trim()).catch(() => {})

  return data
}

async function sendPush(cleanerId: string, body: string) {
  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('push_subscriptions')
    .select('subscription')
    .eq('cleaner_id', cleanerId)
    .single()

  if (!data) return

  const webpush = (await import('web-push')).default
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  try {
    await webpush.sendNotification(
      data.subscription as Parameters<typeof webpush.sendNotification>[0],
      JSON.stringify({ title: 'Kardama', body, url: '/messages' }),
    )
  } catch {
    // Subscription expired — clean up
    await admin.from('push_subscriptions').delete().eq('cleaner_id', cleanerId)
  }
}

export async function markMessagesRead(cleanerId: string) {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('cleaner_id', cleanerId)
    .eq('sender_role', 'cleaner')
    .is('read_at', null)
}

export async function getCleanerMessages(cleanerId: string) {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('cleaner_id', cleanerId)
    .order('created_at', { ascending: true })
    .limit(100)
  return data ?? []
}
