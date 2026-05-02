'use client'
import { useEffect, useState } from 'react'
import { saveOwnerPushSubscription } from '@/app/(dashboard)/push-subscribe/actions'

// Registers the service worker and subscribes the owner to web-push the
// first time they grant permission. After that we just keep the existing
// subscription alive — the backend cleans up dead ones on send failure.
export function PwaSetup() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    setPermission(Notification.permission)

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      // If we already have a subscription, refresh the server copy in case
      // the browser regenerated it (browsers do this periodically).
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await saveOwnerPushSubscription(serialize(existing)).catch(() => {})
      }
    }).catch((err) => console.warn('[pwa] sw registration failed', err))
  }, [])

  const requestAndSubscribe = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return

    const reg = await navigator.serviceWorker.ready
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.warn('[pwa] NEXT_PUBLIC_VAPID_PUBLIC_KEY missing — cannot subscribe to push')
      return
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(vapidPublicKey) as BufferSource,
    })
    await saveOwnerPushSubscription(serialize(sub))
  }

  // Render an unobtrusive bell button only when push is supported but
  // not yet granted. Once granted, we go silent.
  if (permission === 'unsupported' || permission === 'granted') return null

  return (
    <button
      onClick={requestAndSubscribe}
      className="fixed bottom-4 right-4 z-[1100] flex items-center gap-2 rounded-full bg-mint-500 text-page px-4 py-2.5 text-[12.5px] font-semibold shadow-lg hover:opacity-95 cursor-pointer"
      title="Get pinged when the AI escalates a customer text to you"
    >
      🔔 Enable owner notifications
    </button>
  )
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function serialize(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint?: string; expirationTime?: number | null; keys?: { p256dh?: string; auth?: string } }
  return {
    endpoint: json.endpoint ?? '',
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  }
}
