// OSRM routing — real road geometry, zero API key required
// Public demo server: https://router.project-osrm.org

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

export interface RealRoute {
  teamId: string
  segments: RoadSegment[]
}

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

async function fetchLeg(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<RoadSegment[]> {
  const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`OSRM ${res.status}`)
  const data = await res.json()
  const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates ?? []
  if (coords.length < 2) return []
  return [{ positions: coords.map(([lng, lat]) => [lat, lng]), congestion: 'unknown' }]
}

// token param kept for API compatibility, unused
export async function fetchTeamRoute(
  teamId: string,
  waypoints: Array<{ lat: number; lng: number }>,
  _token = '',
  signal?: AbortSignal,
): Promise<RealRoute | null> {
  if (waypoints.length < 2) return null
  try {
    const legs = await Promise.all(
      waypoints.slice(0, -1).map((from, i) => fetchLeg(from, waypoints[i + 1], signal))
    )
    return { teamId, segments: legs.flat() }
  } catch (err) {
    console.error(`[osrm] ${teamId}:`, err)
    return null
  }
}
