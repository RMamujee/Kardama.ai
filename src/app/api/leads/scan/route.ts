import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Vercel Cron endpoint — scans Facebook groups for cleaning leads via Apify.
//
// Required env vars:
//   APIFY_TOKEN          — Apify API token (get from apify.com/account/integrations)
//   FB_TARGET_GROUPS     — comma-separated Facebook group slugs or full URLs
//                          e.g. "longbeachmoms,south-bay-neighbors,https://www.facebook.com/groups/torrance"
//   APIFY_FB_COOKIES     — JSON array of Facebook cookies exported from your browser
//                          (required for private/members-only groups)
//                          e.g. '[{"name":"c_user","value":"12345","domain":".facebook.com"},...]'
//   CRON_SECRET          — shared secret Vercel sends in Authorization: Bearer header

function isAuthorizedCron(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return request.headers.get('authorization') === `Bearer ${expected}`
}

const CLEANING_KEYWORDS = [
  'cleaning service', 'cleaning company', 'house cleaning', 'home cleaning',
  'deep clean', 'move-out clean', 'maid service', 'housekeeper', 'housekeeping',
  'cleaner', 'house cleaner', 'airbnb cleaner', 'airbnb turnover',
]
const SEEKING_KEYWORDS = [
  'looking for', 'need a', 'need someone', 'anyone recommend', 'recommendations',
  'suggestion', 'anyone know', 'any good', 'who do you use', 'can anyone',
  'where can i find', 'who to call', 'any suggestions',
]
const URGENCY_HIGH = ['asap', 'urgently', 'today', 'tonight', 'immediately', 'last minute', 'this week', 'emergency']
const URGENCY_MEDIUM = ['next week', 'soon', 'this month', 'upcoming']

const CITIES = [
  'Long Beach', 'Torrance', 'El Segundo', 'Manhattan Beach', 'Redondo Beach',
  'Hawthorne', 'Lakewood', 'Carson', 'Signal Hill', 'Compton', 'Gardena',
  'Inglewood', 'Lawndale', 'Hermosa Beach', 'West Carson', 'Bellflower',
  'South Bay', 'Los Angeles',
]

function hasCleaningKeyword(text: string): boolean {
  const lower = text.toLowerCase()
  return CLEANING_KEYWORDS.some(kw => lower.includes(kw))
}

function isSeeking(text: string): boolean {
  const lower = text.toLowerCase()
  return SEEKING_KEYWORDS.some(kw => lower.includes(kw))
}

function detectUrgency(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()
  if (URGENCY_HIGH.some(kw => lower.includes(kw))) return 'high'
  if (URGENCY_MEDIUM.some(kw => lower.includes(kw))) return 'medium'
  return 'low'
}

function extractLocation(text: string, groupName: string): string {
  const haystack = (text + ' ' + groupName).toLowerCase()
  const found = CITIES.find(city => haystack.includes(city.toLowerCase()))
  return found ? `${found}, CA` : 'Los Angeles, CA'
}

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

interface ApifyPost {
  postId?: string
  postUrl?: string
  text?: string
  fullText?: string
  userFullName?: string
  userName?: string
  timestamp?: string
  date?: string
  likesCount?: number
  commentsCount?: number
  groupName?: string
  [key: string]: unknown
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    return NextResponse.json({ error: 'APIFY_TOKEN not configured' }, { status: 503 })
  }

  const rawGroups = process.env.FB_TARGET_GROUPS
  if (!rawGroups) {
    return NextResponse.json({ error: 'FB_TARGET_GROUPS not configured' }, { status: 503 })
  }

  const groups = rawGroups.split(',').map(g => g.trim()).filter(Boolean)

  // Build search URLs: one per group per keyword for best coverage
  const startUrls = groups.flatMap(group => {
    const base = group.startsWith('http')
      ? group.replace(/\/$/, '')
      : `https://www.facebook.com/groups/${group}`
    return [
      { url: `${base}/search?q=cleaning+service` },
      { url: `${base}/search?q=house+cleaning` },
      { url: `${base}/search?q=cleaner` },
    ]
  })

  let cookies: object[] = []
  if (process.env.APIFY_FB_COOKIES) {
    try {
      cookies = JSON.parse(process.env.APIFY_FB_COOKIES) as object[]
    } catch {
      console.warn('[leads/scan] APIFY_FB_COOKIES is not valid JSON — running without cookies (public groups only)')
    }
  }

  // apify~facebook-groups-scraper: run-sync-get-dataset-items waits up to `timeout` seconds
  // and returns the dataset items directly. We use 55s to stay under Vercel's 60s limit.
  let posts: ApifyPost[] = []
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=55`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls,
          resultsType: 'posts',
          resultsLimit: 20,
          cookies,
          maxRequestRetries: 1,
        }),
        signal: AbortSignal.timeout(58_000),
      }
    )

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[leads/scan] Apify HTTP error', res.status, err.slice(0, 300))
      return NextResponse.json({ error: `Apify error ${res.status}` }, { status: 502 })
    }

    posts = await res.json() as ApifyPost[]
  } catch (err) {
    console.error('[leads/scan] Apify request failed:', err)
    return NextResponse.json({ error: 'Apify request failed', detail: String(err) }, { status: 500 })
  }

  // Filter to posts where someone is actively seeking a cleaning service
  const leads = posts.filter(p => {
    const text = p.text ?? p.fullText ?? ''
    return hasCleaningKeyword(text) && isSeeking(text)
  })

  const db = getSupabaseAdminClient()
  let saved = 0

  for (const post of leads) {
    const text = post.text ?? post.fullText ?? ''
    const authorName = post.userFullName ?? post.userName ?? 'Facebook User'
    const groupName = post.groupName ?? 'Facebook Group'
    const externalId = post.postId ?? post.postUrl ?? null
    const postedAt = post.timestamp ?? post.date ?? new Date().toISOString()

    const { error } = await db.from('social_leads').upsert(
      {
        platform: 'facebook-group' as const,
        author: authorName,
        author_initials: getInitials(authorName),
        group_or_page: groupName,
        content: text,
        posted_at: new Date(postedAt).toISOString(),
        status: 'new' as const,
        location: extractLocation(text, groupName),
        urgency: detectUrgency(text),
        likes: post.likesCount ?? 0,
        comments_count: post.commentsCount ?? 0,
        responded_at: null,
        response_used: null,
        captured_at: null,
        external_id: externalId,
        messenger_psid: null,
        raw_data: post as object,
      },
      { onConflict: 'external_id', ignoreDuplicates: true }
    )

    if (error) {
      console.error('[leads/scan] upsert error:', error.message)
    } else {
      saved++
    }
  }

  console.log(`[leads/scan] scanned=${posts.length} qualified=${leads.length} saved=${saved}`)
  return NextResponse.json({ scanned: posts.length, qualified: leads.length, saved })
}

// Pro-tier — give Apify room to breathe
export const maxDuration = 60
