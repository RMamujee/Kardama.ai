import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCleaners, getTodayJobs } from '@/lib/data'
import { buildOptimizedRoutes } from '@/lib/routing-engine'

// POST /api/routes/compute  (owner-only)
// Builds optimised routes for today, calls Google Directions per team, and
// upserts the results into daily_routes so the dashboard + mobile can read
// them without re-hitting the Google API on every page load.
// Returns cached results if last computation was < 30 min ago.

const STALE_AFTER_MS = 30 * 60 * 1000

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    coords.push([lat / 1e5, lng / 1e5])
  }
  return coords
}

function congestionFromRatio(ratio: number): string {
  if (ratio >= 1.65) return 'heavy'
  if (ratio >= 1.35) return 'moderate'
  return 'clear'
}

type Waypoint = { lat: number; lng: number }

type DailyRoute = {
  team_id: string
  route_date: string
  segments: { positions: [number, number][]; congestion: string }[]
  legs: { durationMin: number; distanceKm: number; traffic: string }[]
  stop_order: unknown[]
  total_drive_min: number
  total_km: number
  computed_at: string
}

async function fetchGoogleDirections(waypoints: Waypoint[]) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey || waypoints.length < 2) return null

  const origin = `${waypoints[0].lat},${waypoints[0].lng}`
  const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`
  const params = new URLSearchParams({ origin, destination, departure_time: 'now', traffic_model: 'best_guess', key: apiKey })
  if (waypoints.length > 2) {
    params.set('waypoints', `optimize:false|${waypoints.slice(1, -1).map(w => `${w.lat},${w.lng}`).join('|')}`)
  }

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'OK' || !data.routes?.[0]) return null

    type GLeg = { duration: { value: number }; duration_in_traffic?: { value: number }; distance: { value: number }; steps: Array<{ polyline: { points: string } }> }
    const apiLegs = data.routes[0].legs as GLeg[]

    const segments = apiLegs.map(leg => {
      const positions = leg.steps.flatMap(s => decodePolyline(s.polyline.points))
      const trafficSecs = leg.duration_in_traffic?.value ?? leg.duration.value
      return { positions, congestion: congestionFromRatio(trafficSecs / Math.max(leg.duration.value, 1)) }
    })
    const legs = apiLegs.map(leg => ({
      durationMin: (leg.duration_in_traffic ?? leg.duration).value / 60,
      distanceKm: leg.distance.value / 1000,
      traffic: congestionFromRatio((leg.duration_in_traffic?.value ?? leg.duration.value) / Math.max(leg.duration.value, 1)),
    }))

    return { segments, legs }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  // Auth: owner only
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'owner_operator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const today = new Date().toISOString().split('T')[0]
  const admin = getSupabaseAdminClient()

  const forceRecompute = req.headers.get('x-force') === '1'

  // Return cached routes if fresh (unless dispatcher forced a refresh)
  if (!forceRecompute) {
    const { data: existing } = await admin
      .from('daily_routes')
      .select('*')
      .eq('route_date', today)

    if (existing?.length) {
      const rows = existing as unknown as DailyRoute[]
      const staleThreshold = new Date(Date.now() - STALE_AFTER_MS).toISOString()
      const allFresh = rows.every(r => r.computed_at > staleThreshold)
      if (allFresh) {
        return NextResponse.json({
          routes: rows.map(r => ({ teamId: r.team_id, segments: r.segments, legs: r.legs })),
          source: 'cache',
        })
      }
    }
  }

  // Recompute: fetch data, build routes, call Google per team
  const [cleaners, todayJobs] = await Promise.all([getCleaners(), getTodayJobs()])
  const teamRoutes = buildOptimizedRoutes(todayJobs, cleaners)

  const computed = await Promise.all(
    teamRoutes.map(async (route) => {
      const waypoints: Waypoint[] = [
        { lat: route.startLat, lng: route.startLng },
        ...route.stops
          .filter(s => s.status !== 'cancelled')
          .map(s => ({ lat: s.job.lat, lng: s.job.lng })),
      ]

      const dirData = await fetchGoogleDirections(waypoints)

      const row = {
        team_id:         route.teamId,
        route_date:      today,
        stop_order:      route.stops.map(s => ({
          jobId: s.job.id, lat: s.job.lat, lng: s.job.lng,
          address: s.job.address, scheduledTime: s.job.scheduledTime,
          sequence: s.sequence,
        })),
        segments:        dirData?.segments ?? [],
        legs:            dirData?.legs ?? [],
        total_drive_min: route.totalDriveMin,
        total_km:        route.totalKm,
        computed_at:     new Date().toISOString(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('daily_routes') as any).upsert(row, { onConflict: 'team_id,route_date' })

      return { teamId: route.teamId, segments: row.segments, legs: row.legs }
    }),
  )

  return NextResponse.json({ routes: computed, source: 'computed' })
}
