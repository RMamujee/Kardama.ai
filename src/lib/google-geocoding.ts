// Client-side geocoding helper — calls /api/geocode which proxies to Google.

export interface GeocodeResult {
  lat: number
  lng: number
  formatted: string
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
    if (!res.ok) return null
    return (await res.json()) as GeocodeResult
  } catch {
    return null
  }
}
