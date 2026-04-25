// Mapbox Directions API — real road geometry + live congestion per segment

export const CONGESTION_COLOR: Record<string, string> = {
  low:      '#22c55e',
  moderate: '#f97316',
  heavy:    '#ef4444',
  severe:   '#7f1d1d',
  unknown:  '#94a3b8',
}

export interface RoadSegment {
  positions: [number, number][]   // [lat, lng] pairs for Leaflet
  congestion: string              // low | moderate | heavy | severe | unknown
}

export interface RealRoute {
  teamId: string
  segments: RoadSegment[]
}

// Fetch a single leg (2 waypoints) and return congestion-grouped road segments.
// Using 2-waypoint calls ensures annotation[k] maps exactly to coords[k]→coords[k+1].
async function fetchLeg(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
  token: string,
): Promise<RoadSegment[]> {
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?access_token=${token}` +
    `&geometries=geojson&overview=full&annotations=congestion&steps=false`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Mapbox ${res.status}`)
  const data = await res.json()

  const route = data.routes?.[0]
  if (!route) return []

  const coords: [number, number][] = route.geometry.coordinates   // [lng, lat]
  const cong: string[] = route.legs?.[0]?.annotation?.congestion ?? []

  if (coords.length < 2) return []

  // Group consecutive coords with the same congestion level into one Polyline
  const segments: RoadSegment[] = []
  let segStart = 0

  for (let i = 1; i < coords.length; i++) {
    const level     = cong[i - 1] ?? 'unknown'
    const nextLevel = cong[i]     ?? 'unknown'
    const isLast    = i === coords.length - 1

    if (isLast || nextLevel !== level) {
      // Close current group (include the endpoint coord)
      segments.push({
        positions: coords.slice(segStart, i + 1).map(([lng, lat]) => [lat, lng]),
        congestion: level,
      })
      segStart = i
    }
  }

  return segments
}

// Fetch the full multi-stop route for one team.
// waypoints = [teamStartPos, stop1, stop2, stop3, ...]
export async function fetchTeamRoute(
  teamId: string,
  waypoints: Array<{ lat: number; lng: number }>,
  token: string,
): Promise<RealRoute | null> {
  if (waypoints.length < 2) return null

  try {
    // Fetch each leg in parallel for speed
    const legResults = await Promise.all(
      waypoints.slice(0, -1).map((from, i) => fetchLeg(from, waypoints[i + 1], token))
    )

    return {
      teamId,
      segments: legResults.flat(),
    }
  } catch (err) {
    console.error(`[mapbox-routing] ${teamId}:`, err)
    return null
  }
}
