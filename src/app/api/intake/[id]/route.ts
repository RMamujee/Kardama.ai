import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/supabase/dal'

const INTAKE_CORS = {
  'Access-Control-Allow-Origin': 'https://kardama-intake.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: INTAKE_CORS })
}

// Public — secured by unguessable UUID. Returns only safe display fields.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('booking_requests')
    .select('id, customer_name, preferred_date, preferred_time, home_size, status')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: INTAKE_CORS })
  }
  return NextResponse.json(data, { headers: INTAKE_CORS })
}

// PATCH /api/intake/[id] — owner accepts or declines a booking request
// Declining automatically cancels the associated pending payment (if any)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getSessionUser()
  if (!user || user.role !== 'owner_operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { status: 'accepted' | 'declined' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.status !== 'accepted' && body.status !== 'declined') {
    return NextResponse.json({ error: 'status must be "accepted" or "declined"' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('booking_requests')
    .update({ status: body.status })
    .eq('id', id)

  if (error) {
    console.error('[PATCH /api/intake/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // When declining, cancel any pending payment that was auto-logged for this request
  if (body.status === 'declined') {
    await supabase
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('booking_ref', id)
      .eq('status', 'pending')
  }

  return NextResponse.json({ ok: true })
}
