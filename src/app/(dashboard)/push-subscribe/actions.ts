'use server'
import { requireOwner } from '@/lib/supabase/dal'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Browser-side PushSubscription serialized to a plain object.
type SerializedPushSubscription = {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

// Upsert the owner's push subscription. Called from PwaSetup once the
// browser grants permission and registers the service worker.
export async function saveOwnerPushSubscription(subscription: SerializedPushSubscription) {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) throw new Error('not authenticated')

  const admin = getSupabaseAdminClient()
  const { error } = await admin
    .from('owner_push_subscriptions')
    .upsert({ user_id: userId, subscription: subscription as unknown as object }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function clearOwnerPushSubscription() {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return
  const admin = getSupabaseAdminClient()
  await admin.from('owner_push_subscriptions').delete().eq('user_id', userId)
}
