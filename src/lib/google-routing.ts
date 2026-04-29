// Google Directions-backed routing — drop-in replacement for mapbox-routing.ts.
// All actual API calls are proxied through /api/routing so the Google Maps key
// never leaves the server.

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
  traffic?: string
}

export interface RealRoute {
  teamId: string
  segments: RoadSegment[]
  legs: LegMetrics[]
}

// Same signature as the old OSRM fetchTeamRoute — callers need no changes except the import.
// _token kept for API compatibility.
export async function fetchTeamRoute(
  teamId: string,
  waypoints: Array<{ lat: number; lng: number; address?: string }>,
  _token = '',
  signal?: AbortSignal,
): Promise<RealRoute | null> {
  if (waypoints.length < 2) return null
  try {
    const res = await fetch('/api/routing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, waypoints }),
      signal,
    })
    if (!res.ok) {
      console.error(`[google-routing] ${teamId}: HTTP ${res.status}`)
      return null
    }
    return (await res.json()) as RealRoute
  } catch (err) {
    if ((err as { name?: string })?.name !== 'AbortError') {
      console.error(`[google-routing] ${teamId}:`, err)
    }
    return null
  }
}
