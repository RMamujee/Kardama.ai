import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/supabase/dal'

// POST /api/leads/trigger
// Owner-only. Fires the matching n8n webhook to run an Apify scraper on demand.
// Body: { source: 'google-maps' | 'yelp' | 'instagram' | 'facebook-pages', city?, keyword?, limit?, hashtag? }
//
// Each scraper has its own webhook URL env var. n8n owns the Apify token + the actor logic;
// the dashboard only kicks off a run and lets n8n POST results back to /api/leads.

type ScraperSource = 'google-maps' | 'yelp' | 'instagram' | 'facebook-pages'

const WEBHOOK_ENV: Record<ScraperSource, string> = {
  'google-maps':    'N8N_SCRAPER_GOOGLE_MAPS_WEBHOOK_URL',
  'yelp':           'N8N_SCRAPER_YELP_WEBHOOK_URL',
  'instagram':      'N8N_SCRAPER_INSTAGRAM_WEBHOOK_URL',
  'facebook-pages': 'N8N_SCRAPER_FACEBOOK_PAGES_WEBHOOK_URL',
}

interface TriggerBody {
  source?: ScraperSource
  city?: string
  keyword?: string
  hashtag?: string
  limit?: number
}

function isSource(value: unknown): value is ScraperSource {
  return value === 'google-maps' || value === 'yelp' || value === 'instagram' || value === 'facebook-pages'
}

export async function POST(request: Request) {
  await requireOwner()

  let body: TriggerBody
  try {
    body = await request.json() as TriggerBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isSource(body.source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  const envName = WEBHOOK_ENV[body.source]
  const webhookUrl = process.env[envName]
  if (!webhookUrl) {
    return NextResponse.json({ error: `${envName} not configured` }, { status: 503 })
  }

  const limit = Math.max(1, Math.min(body.limit ?? 30, 100))

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: body.source,
        city: body.city ?? '',
        keyword: body.keyword ?? '',
        hashtag: body.hashtag ?? '',
        limit,
        triggeredBy: 'dashboard',
        triggeredAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[leads/trigger] n8n webhook error', res.status, text.slice(0, 300))
      return NextResponse.json({ error: `n8n webhook ${res.status}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true, source: body.source, limit })
  } catch (err) {
    console.error('[leads/trigger] webhook call failed:', err)
    return NextResponse.json({ error: 'Webhook call failed', detail: String(err) }, { status: 500 })
  }
}
