'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin, WifiOff } from 'lucide-react'

type State = 'waiting' | 'active' | 'denied' | 'error'

export function LocationTracker() {
  const [state, setState] = useState<State>('waiting')
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setState('error')
      return
    }

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setState('active')
        try {
          await fetch('/api/cleaner/location', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          })
          setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        } catch {
          // silent — will retry on next position event
        }
      },
      (err) => {
        setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      },
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  if (state === 'denied' || state === 'error') {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
        style={{ background: 'var(--bg-soft)', color: 'var(--color-rose-500)' }}
      >
        <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
        {state === 'denied'
          ? 'Location access denied — enable in browser settings'
          : 'GPS unavailable'}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
      style={{ background: 'var(--bg-soft)', color: state === 'active' ? 'var(--color-emerald-500)' : 'var(--ink-400)' }}
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{
          background: state === 'active' ? 'var(--color-emerald-500)' : 'var(--ink-300)',
          boxShadow: state === 'active' ? '0 0 6px var(--color-emerald-500)' : 'none',
        }}
      />
      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
      {state === 'active'
        ? `GPS live${lastUpdate ? ` · ${lastUpdate}` : ''}`
        : 'Acquiring GPS…'}
    </div>
  )
}
