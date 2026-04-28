import 'server-only'

/**
 * Nominatim geocoder — free OSM-backed lookup. 1 request/second is fair-use;
 * we wrap each call so a single misconfigured retry can't flood them.
 *
 * Per their usage policy, we MUST send a meaningful User-Agent.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'Kardama.ai/1.0 (operations dashboard for cleaning businesses)'

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
  city?: string
  state?: string
  postcode?: string
}

interface NominatimItem {
  lat: string
  lon: string
  display_name: string
  address?: {
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
  }
}

export async function geocodeAddress(address: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const trimmed = address.trim()
  if (trimmed.length < 5) return null

  const url = new URL(ENDPOINT)
  url.searchParams.set('q', trimmed)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('countrycodes', 'us')

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: signal ?? AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      console.error('[geocode] non-OK response', res.status)
      return null
    }
    const data = await res.json() as NominatimItem[]
    const hit = data[0]
    if (!hit) return null

    const lat = Number(hit.lat)
    const lng = Number(hit.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return {
      lat,
      lng,
      displayName: hit.display_name,
      city: hit.address?.city ?? hit.address?.town ?? hit.address?.village,
      state: hit.address?.state,
      postcode: hit.address?.postcode,
    }
  } catch (err) {
    console.error('[geocode] failed:', err)
    return null
  }
}
