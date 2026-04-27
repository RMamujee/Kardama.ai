// OSRM routing — real road geometry, zero API key required.
// Single multi-waypoint request per team, with retry/backoff for 429s.
// Returns per-leg duration/distance so the schedule can use real numbers
// instead of haversine guesses.

export const CONGESTION_COLOR: Record<string, string> = {
  clear:    '#22c55e',
  moderate: '#f97316',
  heavy:    '#ef4444',
  unknown:  '#94a3b8',
}

export interface RoadSegment {
  positions: [number, number][]
  congestion: string
}

export interface LegMetrics {
  durationMin: number
  distanceKm: number
}

export interface RealRoute {
  teamId: string
  segments: RoadSegment[]   // one per leg, in order
  legs: LegMetrics[]        // parallel to segments
}

const OSRM_HOST = 'https://router.project-osrm.org'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchWithRetry(url: string, signal?: AbortSignal): Promise<Response> {
  // Retry on 429 / 5xx with exponential backoff. Bail fast on user abort.
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
      if (res.ok) return res
      if (res.status === 429 || res.status >= 500) {
        await sleep(400 * 2 ** attempt + Math.random() * 200)
        continue
      }
      return res // 4xx other than 429 — no point retrying
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') throw err
      lastErr = err
      await sleep(400 * 2 ** attempt + Math.random() * 200)
    }
  }
  throw lastErr ?? new Error('OSRM request failed after retries')
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// token param kept for API compatibility, unused
export async function fetchTeamRoute(
  teamId: string,
  waypoints: Array<{ lat: number; lng: number }>,
  _token = '',
  signal?: AbortSignal,
): Promise<RealRoute | null> {
  if (waypoints.length < 2) return null

  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';')
  const url = `${OSRM_HOST}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&annotations=false`

  try {
    const res = await fetchWithRetry(url, signal)
    if (!res.ok) {
      console.error(`[osrm] ${teamId}: HTTP ${res.status}`)
      return null
    }
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route) return null

    const fullCoords: [number, number][] = route.geometry?.coordinates ?? []
    const apiLegs: Array<{ duration: number; distance: number }> = route.legs ?? []
    if (apiLegs.length !== waypoints.length - 1 || fullCoords.length < 2) return null

    // OSRM with overview=full returns one polyline for the whole trip; we split
    // it back into per-leg segments by walking the cumulative distance and
    // matching each leg's distance budget.
    const totalDistance = apiLegs.reduce((s, l) => s + l.distance, 0)
    const segments: RoadSegment[] = []

    if (totalDistance <= 0 || apiLegs.length === 1) {
      segments.push({
        positions: fullCoords.map(([lng, lat]) => [lat, lng]),
        congestion: 'unknown',
      })
    } else {
      const cum: number[] = [0]
      for (let i = 1; i < fullCoords.length; i++) {
        const [lng1, lat1] = fullCoords[i - 1]
        const [lng2, lat2] = fullCoords[i]
        cum.push(cum[i - 1] + haversineMeters(lat1, lng1, lat2, lng2))
      }
      const cumTotal = cum[cum.length - 1] || 1

      let cursor = 0
      let target = 0
      for (let i = 0; i < apiLegs.length; i++) {
        target += (apiLegs[i].distance / totalDistance) * cumTotal
        let end = cursor
        while (end < cum.length - 1 && cum[end] < target) end++
        const slice = fullCoords.slice(cursor, end + 1)
        if (slice.length >= 2) {
          segments.push({
            positions: slice.map(([lng, lat]) => [lat, lng]),
            congestion: 'unknown',
          })
        } else {
          segments.push({
            positions: [[fullCoords[cursor][1], fullCoords[cursor][0]]],
            congestion: 'unknown',
          })
        }
        cursor = end
      }
    }

    const legs: LegMetrics[] = apiLegs.map(l => ({
      durationMin: l.duration / 60,
      distanceKm: l.distance / 1000,
    }))

    return { teamId, segments, legs }
  } catch (err) {
    if ((err as { name?: string })?.name !== 'AbortError') {
      console.error(`[osrm] ${teamId}:`, err)
    }
    return null
  }
}
