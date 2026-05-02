// Kardama owner PWA service worker.
// Minimal: just relays web-push payloads as native notifications and
// deep-links into the dashboard when the user taps. No offline caching —
// the dashboard is a live tool and stale data would be misleading.

const CACHE_NAME = 'kardama-shell-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { title: 'Kardama', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Kardama'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'kardama-default',
    renotify: Boolean(data.tag),
    data: { url: data.url || '/dashboard' },
    actions: data.actions || [],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing window if one is open
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url).catch(() => {})
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
