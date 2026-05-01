import { NextResponse } from 'next/server'

// Server proxy for Google Places API v1 (places:searchText). Lets n8n call
// the Places API without a separate credential — n8n already has the
// shared CRON_SECRET to hit /api/leads, so we reuse the same auth here.
//
// Required env vars:
//   GOOGLE_MAPS_API_KEY — Google Cloud API key with "Places API (New)" enabled
//   CRON_SECRET         — bearer token shared with n8n
//
// Body: { keyword: string, city: string, limit?: number }
// Returns: { places: GooglePlacesResult[] } — pass-through of the API response

interface SearchBody {
  keyword?: string
  city?: string
  limit?: number
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.googleMapsUri',
].join(',')

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return request.headers.get('authorization') === `Bearer ${expected}`
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not configured' }, { status: 503 })
  }

  let body: SearchBody
  try {
    body = await request.json() as SearchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const keyword = (body.keyword ?? '').trim()
  const city = (body.city ?? '').trim()
  if (!keyword || !city) {
    return NextResponse.json({ error: 'keyword and city are required' }, { status: 400 })
  }

  const limit = Math.max(1, Math.min(body.limit ?? 30, 60))
  const textQuery = `${keyword} in ${city}`

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, pageSize: limit, languageCode: 'en' }),
      signal: AbortSignal.timeout(28_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[places/search] google error', res.status, text.slice(0, 300))
      return NextResponse.json({ error: `Places API ${res.status}`, detail: text.slice(0, 300) }, { status: 502 })
    }

    const json = await res.json() as { places?: unknown[] }
    return NextResponse.json({ places: json.places ?? [] })
  } catch (err) {
    console.error('[places/search] unexpected', err)
    return NextResponse.json({ error: 'Places API request failed', detail: String(err) }, { status: 500 })
  }
}

export const maxDuration = 30
