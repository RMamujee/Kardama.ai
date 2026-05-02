import 'server-only'
import { getSupabaseAdminClient } from './supabase/admin'

interface OwnerPushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

// Fan-out a push to every owner that has a registered subscription.
// In practice there's usually 1–2 owners, so a loop is fine. Drops dead
// subscriptions automatically — no need to clean them up elsewhere.
export async function sendOwnerPush(payload: OwnerPushPayload): Promise<void> {
  const subject     = process.env.VAPID_SUBJECT
  const publicKey   = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey  = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) {
    console.warn('[owner-push] VAPID keys not configured — skipping push')
    return
  }

  const admin = getSupabaseAdminClient()
  const { data: subs } = await admin
    .from('owner_push_subscriptions')
    .select('id, user_id, subscription')
  if (!subs?.length) return

  const webpush = (await import('web-push')).default
  webpush.setVapidDetails(subject, publicKey, privateKey)

  await Promise.all(subs.map(async (row) => {
    try {
      await webpush.sendNotification(
        row.subscription as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify(payload),
      )
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        // Subscription expired — drop it.
        await admin.from('owner_push_subscriptions').delete().eq('id', row.id as string)
      } else {
        console.warn('[owner-push] send failed for', row.user_id, err)
      }
    }
  }))
}
