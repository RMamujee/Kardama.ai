import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCleaners, getJobs } from '@/lib/data'
import { buildOptimizedRoutes } from '@/lib/routing-engine'

// GET /api/admin/route-diag — returns full routing diagnostic for the UI
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'owner_operator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  // 1. Key presence
  const serverKey = process.env.GOOGLE_MAPS_API_KEY
  const publicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const apiKey = serverKey ?? publicKey

  // 2. Live Google Directions test (Redondo Beach → Torrance)
  let googleStatus = 'not-tested'
  let googleError = ''
  if (apiKey) {
    try {
      const params = new URLSearchParams({
        origin: '33.849,-118.388',
        destination: '33.853,-118.356',
        key: apiKey,
      })
      const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`, { cache: 'no-store' })
      const data = await res.json() as { status: string; error_message?: string }
      googleStatus = data.status
      googleError = data.error_message ?? ''
    } catch (e) {
      googleStatus = 'FETCH_ERROR'
      googleError = String(e)
    }
  } else {
    googleStatus = 'NO_KEY'
  }

  // 3. DB state
  const admin = getSupabaseAdminClient()
  const [cleaners, allJobs] = await Promise.all([getCleaners(), getJobs()])
  const jobsByDate: Record<string, number> = {}
  allJobs.forEach(j => { jobsByDate[j.scheduledDate] = (jobsByDate[j.scheduledDate] ?? 0) + 1 })

  const dateJobs = allJobs.filter(j => j.scheduledDate === date)
  const routes = buildOptimizedRoutes(dateJobs, cleaners)

  // 4. Cached routes for this date
  const { data: cached } = await admin.from('daily_routes').select('team_id, computed_at, segments').eq('route_date', date)
  const cachedSummary = (cached ?? []).map((r: Record<string, unknown>) => ({
    teamId: r.team_id,
    computedAt: r.computed_at,
    segmentsCount: Array.isArray(r.segments) ? r.segments.length : 0,
  }))

  return NextResponse.json({
    date,
    google: {
      serverKeyPresent: !!serverKey,
      publicKeyPresent: !!publicKey,
      status: googleStatus,
      error: googleError,
    },
    db: {
      cleanerCount: cleaners.length,
      cleaners: cleaners.map(c => ({ id: c.id, name: c.name, teamId: c.teamId })),
      jobsByDate,
      jobsForDate: dateJobs.length,
      jobs: dateJobs.map(j => ({ id: j.id, address: j.address, lat: j.lat, lng: j.lng, teamId: j.teamId, cleanerIds: j.cleanerIds, status: j.status })),
    },
    routing: {
      routeCount: routes.length,
      routes: routes.map(r => ({ teamId: r.teamId, stopCount: r.stops.length, startLat: r.startLat, startLng: r.startLng })),
    },
    cache: cachedSummary,
  })
}
