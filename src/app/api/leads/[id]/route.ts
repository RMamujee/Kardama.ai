import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/supabase/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SocialLeadStatus = 'new' | 'responded' | 'captured' | 'dismissed'

interface PatchBody {
  status?: SocialLeadStatus
  responded_at?: string | null
  response_used?: string | null
  captured_at?: string | null
}

// PATCH /api/leads/[id] — update lead status (respond, capture, dismiss, restore)
// Called directly from useSocialStore to persist status changes.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireOwner()
  const { id } = await params

  let body: PatchBody
  try {
    body = await request.json() as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: PatchBody = {}
  if ('status' in body) update.status = body.status
  if ('responded_at' in body) update.responded_at = body.responded_at
  if ('response_used' in body) update.response_used = body.response_used
  if ('captured_at' in body) update.captured_at = body.captured_at

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('social_leads')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[PATCH /api/leads/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
