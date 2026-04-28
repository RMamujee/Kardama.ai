import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Returns booked time slots per date so the public intake form can
// disable already-taken slots and prevent double-booking.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const today = new Date().toISOString().split('T')[0]
  const from = searchParams.get('from') ?? today
  const to = searchParams.get('to') ?? (() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().split('T')[0]
  })()

  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('jobs')
    .select('scheduled_date, scheduled_time')
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .neq('status', 'cancelled')

  const bookedSlots: Record<string, string[]> = {}
  for (const job of data ?? []) {
    const date = job.scheduled_date as string
    const time = job.scheduled_time as string
    if (!bookedSlots[date]) bookedSlots[date] = []
    if (!bookedSlots[date].includes(time)) bookedSlots[date].push(time)
  }

  return NextResponse.json({ bookedSlots }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  })
}
