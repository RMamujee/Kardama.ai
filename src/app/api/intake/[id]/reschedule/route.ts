import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { VALID_TIMES } from '@/lib/services'

const VALID_TIMES_SET = new Set(VALID_TIMES)

const CORS = {
  'Access-Control-Allow-Origin': 'https://kardama-intake.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function to24h(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})(am|pm)$/i)
  if (!m) return t
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  const p = m[3].toLowerCase()
  if (p === 'pm' && h !== 12) h += 12
  if (p === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })

  const { preferred_date, preferred_time: rawTime } = body
  const preferred_time = rawTime ? to24h(String(rawTime)) : null

  if (!preferred_date || !preferred_time) {
    return NextResponse.json({ error: 'preferred_date and preferred_time are required' }, { status: 400, headers: CORS })
  }
  if (!VALID_TIMES_SET.has(preferred_time)) {
    return NextResponse.json({ error: 'Invalid time slot' }, { status: 400, headers: CORS })
  }
  const today = new Date().toISOString().split('T')[0]
  if (preferred_date <= today) {
    return NextResponse.json({ error: 'Date must be in the future' }, { status: 400, headers: CORS })
  }

  const admin = getSupabaseAdminClient()

  const { data: booking, error: fetchErr } = await admin
    .from('booking_requests')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404, headers: CORS })
  }
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 409, headers: CORS })
  }

  const { error } = await admin
    .from('booking_requests')
    .update({ preferred_date, preferred_time, status: 'pending' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  }

  return NextResponse.json({ ok: true }, { headers: CORS })
}
