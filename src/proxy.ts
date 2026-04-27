import { NextRequest, NextResponse } from 'next/server'

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20

// In-process counter — for multi-instance production use Upstash Redis instead.
const counters = new Map<string, { n: number; reset: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = counters.get(ip)
  if (!entry || now > entry.reset) {
    counters.set(ip, { n: 1, reset: now + WINDOW_MS })
    return false
  }
  entry.n++
  return entry.n > MAX_PER_WINDOW
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const guarded =
    pathname.startsWith('/api/sms') ||
    pathname.startsWith('/api/campaigns') ||
    pathname.startsWith('/api/marketing') ||
    pathname === '/api/bookings/token' ||
    pathname.startsWith('/api/bookings/token/')

  if (!guarded) return NextResponse.next()

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anon'
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/sms/:path*', '/api/campaigns/:path*', '/api/marketing/:path*', '/api/bookings/token'],
}
