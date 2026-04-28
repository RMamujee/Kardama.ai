import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { SocialLead } from '@/types'

type Platform = 'facebook-group' | 'facebook-page' | 'instagram' | 'nextdoor' | 'messenger'
type LeadStatus = 'new' | 'responded' | 'captured' | 'dismissed'
type Urgency = 'high' | 'medium' | 'low'

type SocialLeadRow = {
  id: string
  platform: string
  author: string
  author_initials: string
  group_or_page: string
  content: string
  posted_at: string
  status: string
  location: string
  urgency: string
  responded_at: string | null
  response_used: string | null
  captured_at: string | null
  likes: number
  comments_count: number
  external_id: string | null
  messenger_psid: string | null
}

function toSocialLead(row: SocialLeadRow): SocialLead {
  return {
    id: row.id,
    platform: row.platform as SocialLead['platform'],
    author: row.author,
    authorInitials: row.author_initials,
    groupOrPage: row.group_or_page,
    content: row.content,
    postedAt: row.posted_at,
    status: row.status as SocialLead['status'],
    location: row.location,
    urgency: row.urgency as SocialLead['urgency'],
    respondedAt: row.responded_at ?? undefined,
    responseUsed: row.response_used ?? undefined,
    capturedAt: row.captured_at ?? undefined,
    likes: row.likes,
    comments: row.comments_count,
  }
}

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

// GET /api/leads — owner-authenticated, returns latest 100 leads
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('social_leads')
      .select('id,platform,author,author_initials,group_or_page,content,posted_at,status,location,urgency,responded_at,response_used,captured_at,likes,comments_count,external_id,messenger_psid')
      .order('posted_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[GET /api/leads]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ leads: (data ?? []).map(toSocialLead) })
  } catch (err) {
    console.error('[GET /api/leads] unexpected:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/leads — accepts:
//   1. Cron/webhook calls (Authorization: Bearer CRON_SECRET)
//   2. Authenticated owner submitting a manual lead via the UI (Supabase session cookie)
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  let isOwner = false
  if (!isCron) {
    try {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()
        isOwner = profile?.role === 'owner_operator'
      }
    } catch {
      // auth check failed — deny below
    }
  }

  if (!isCron && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.content || !body.platform || !body.author) {
    return NextResponse.json({ error: 'Missing required fields: content, platform, author' }, { status: 400 })
  }

  const db = getSupabaseAdminClient()
  const { data, error } = await db
    .from('social_leads')
    .insert({
      platform: body.platform as Platform,
      author: body.author as string,
      author_initials: (body.author_initials as string | undefined) ?? getInitials(body.author as string),
      group_or_page: (body.group_or_page as string | undefined) ?? '',
      content: body.content as string,
      posted_at: (body.posted_at as string | undefined) ?? new Date().toISOString(),
      status: 'new' as LeadStatus,
      location: (body.location as string | undefined) ?? '',
      urgency: ((body.urgency as string | undefined) ?? 'medium') as Urgency,
      likes: (body.likes as number | undefined) ?? 0,
      comments_count: (body.comments_count as number | undefined) ?? 0,
      responded_at: null,
      response_used: null,
      captured_at: null,
      external_id: (body.external_id as string | null | undefined) ?? null,
      messenger_psid: null,
      raw_data: null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[POST /api/leads]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data?.id }, { status: 201 })
}
