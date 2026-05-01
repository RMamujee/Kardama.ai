import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ───────────────────────── rate limiting (unchanged) ─────────────────────────
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
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

// ───────────────────────── route classification ─────────────────────────
const PUBLIC_PATHS = ['/login', '/auth/callback']
const PUBLIC_PREFIXES = ['/book', '/request', '/api/bookings', '/api/intake', '/api/webhooks', '/api/auth', '/api/campaigns/scan']
const OWNER_PREFIXES = [
  '/dashboard', '/customers', '/scheduling', '/payments', '/team',
  '/campaigns', '/marketing', '/messages', '/inbox', '/analytics', '/map',
]
const CLEANER_PREFIXES = ['/me']

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isOwnerArea(pathname: string) {
  return OWNER_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isCleanerArea(pathname: string) {
  return CLEANER_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// ───────────────────────── proxy ─────────────────────────
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limit guarded API endpoints first.
  const guarded =
    pathname.startsWith('/api/sms') ||
    pathname.startsWith('/api/campaigns') ||
    pathname.startsWith('/api/marketing') ||
    pathname.startsWith('/api/intake') ||
    pathname === '/api/bookings/token' ||
    pathname.startsWith('/api/bookings/token/')

  if (guarded) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anon'
    if (rateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  // Refresh Supabase auth cookies on every request (keeps the session alive).
  // Following the @supabase/ssr Next.js pattern: read req cookies, write res cookies.
  let response = NextResponse.next({ request: req })

  // If env vars aren't set yet, skip auth entirely (lets the app boot before Supabase is provisioned).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) req.cookies.set(name, value)
          response = NextResponse.next({ request: req })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // IMPORTANT: getUser() must be called between createServerClient and any auth-dependent logic
  // — it forces the SSR helper to refresh expired cookies before we make routing decisions.
  const { data: { user } } = await supabase.auth.getUser()

  // Public paths: allow through. If the user is logged in and visits /login, send them to their home.
  if (isPublic(pathname)) {
    if (user && pathname === '/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      // Only redirect if there's a valid profile — no profile means the auth session is
      // orphaned (invite accepted but profile insert failed, etc.) and we must NOT redirect
      // or the user ends up in an infinite /login → /dashboard → /login loop.
      if (profile?.role) {
        const url = req.nextUrl.clone()
        url.pathname = profile.role === 'cleaner' ? '/me' : '/dashboard'
        return NextResponse.redirect(url)
      }
    }
    return response
  }

  // Protected paths require a session.
  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Role-gated areas. Look up role only when entering a protected route.
  if (isOwnerArea(pathname) || isCleanerArea(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role
    if (isOwnerArea(pathname) && role !== 'owner_operator') {
      const url = req.nextUrl.clone()
      url.pathname = role === 'cleaner' ? '/me' : '/login'
      return NextResponse.redirect(url)
    }
    if (isCleanerArea(pathname) && role !== 'cleaner') {
      const url = req.nextUrl.clone()
      url.pathname = role === 'owner_operator' ? '/dashboard' : '/login'
      return NextResponse.redirect(url)
    }
  }

  return response
}

// Run on every page navigation, plus the rate-limited API routes. Static assets and Next internals excluded.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)'],
}
