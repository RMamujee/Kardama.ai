import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const CORS = {
  'Access-Control-Allow-Origin': 'https://kardama-intake.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const admin = getSupabaseAdminClient()

  const { error } = await admin
    .from('booking_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .neq('status', 'cancelled')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  }

  await admin
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('booking_ref', id)
    .eq('status', 'pending')

  return NextResponse.json({ ok: true }, { headers: CORS })
}
