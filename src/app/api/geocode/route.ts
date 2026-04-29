import { NextRequest, NextResponse } from 'next/server'

// GET /api/geocode?address=<address>
// Resolves a human-readable address to lat/lng using Google Geocoding API.
// Responses are cached for 1 hour since geocoding the same address gives the same result.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')
  if (!address?.trim()) {
    return NextResponse.json({ error: 'address query param required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not configured' }, { status: 503 })
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    return NextResponse.json({ error: 'Geocoding API request failed' }, { status: 502 })
  }

  const data = await res.json()
  const result = data.results?.[0]
  if (!result) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 })
  }

  const { lat, lng } = result.geometry.location as { lat: number; lng: number }
  return NextResponse.json(
    { lat, lng, formatted: result.formatted_address as string },
    { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
  )
}
