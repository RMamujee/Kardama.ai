import { NextRequest, NextResponse } from 'next/server'

// Decodes a Google Maps encoded polyline into [lat, lng] pairs.
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

// POST /api/routing
// Body: { teamId: string, waypoints: Array<{ lat: number, lng: number, address?: string }> }
// Returns: { teamId, segments, legs } — same shape as RealRoute in google-routing.ts
export async function POST(req: NextRequest) {
  const { teamId, waypoints } = await req.json() as {
    teamId: string
    waypoints: Array<{ lat: number; lng: number; address?: string }>
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not configured' }, { status: 503 })
  }
  if (!waypoints || waypoints.length < 2) {
    return NextResponse.json({ error: 'At least 2 waypoints required' }, { status: 400 })
  }

  // Geocode any address-only waypoints (lat=0 lng=0 with an address string).
  const resolved = await Promise.all(
    waypoints.map(async (w) => {
      if (w.lat !== 0 || w.lng !== 0) return { lat: w.lat, lng: w.lng }
      if (!w.address) return null
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(w.address)}&key=${apiKey}`,
        )
        const geoData = await geoRes.json()
        const loc = geoData.results?.[0]?.geometry?.location
        return loc ? { lat: loc.lat as number, lng: loc.lng as number } : null
      } catch {
        return null
      }
    }),
  )

  const valid = resolved.filter(Boolean) as Array<{ lat: number; lng: number }>
  if (valid.length < 2) {
    return NextResponse.json({ error: 'Could not resolve enough waypoints' }, { status: 400 })
  }

  const origin = `${valid[0].lat},${valid[0].lng}`
  const destination = `${valid[valid.length - 1].lat},${valid[valid.length - 1].lng}`
  const params = new URLSearchParams({
    origin,
    destination,
    departure_time: 'now',
    traffic_model: 'best_guess',
    key: apiKey,
  })
  if (valid.length > 2) {
    params.set(
      'waypoints',
      `optimize:false|${valid.slice(1, -1).map(w => `${w.lat},${w.lng}`).join('|')}`,
    )
  }

  const dirRes = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params}`,
    // Never cache traffic responses — departure_time=now changes each request.
    { cache: 'no-store' },
  )
  if (!dirRes.ok) {
    return NextResponse.json({ error: 'Directions API request failed' }, { status: 502 })
  }

  const data = await dirRes.json()
  if (data.status !== 'OK' || !data.routes?.[0]) {
    return NextResponse.json(
      { error: data.error_message ?? data.status ?? 'No route found' },
      { status: 404 },
    )
  }

  type GoogleLeg = {
    duration: { value: number }
    duration_in_traffic?: { value: number }
    distance: { value: number }
    steps: Array<{ polyline: { points: string } }>
  }
  const apiLegs = data.routes[0].legs as GoogleLeg[]

  const segments = apiLegs.map((leg) => {
    const positions = leg.steps.flatMap((step) => decodePolyline(step.polyline.points))
    const trafficSecs = leg.duration_in_traffic?.value ?? leg.duration.value
    const ratio = trafficSecs / Math.max(leg.duration.value, 1)
    return { positions, congestion: congestionFromRatio(ratio) }
  })

  const legs = apiLegs.map((leg) => ({
    durationMin: (leg.duration_in_traffic ?? leg.duration).value / 60,
    distanceKm: leg.distance.value / 1000,
    // Pass congestion so routing-engine can use real traffic level per leg.
    traffic: congestionFromRatio(
      (leg.duration_in_traffic?.value ?? leg.duration.value) / Math.max(leg.duration.value, 1),
    ),
  }))

  return NextResponse.json({ teamId, segments, legs })
}
