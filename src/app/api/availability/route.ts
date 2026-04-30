import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Slot times the intake form offers — must stay in sync with IntakeForm TIMES.
const SLOT_TIMES_24H = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00']
const DEFAULT_DURATION = 150

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Returns booked time slots per date.
// A slot is "booked" only when ALL configured teams are unavailable for it,
// so the intake form correctly reflects real capacity.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const today = new Date().toISOString().split('T')[0]
  const from  = searchParams.get('from') ?? today
  const to    = searchParams.get('to') ?? (() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().split('T')[0]
  })()

  const admin = getSupabaseAdminClient()

  const [{ data: jobs }, { data: cleaners }] = await Promise.all([
    admin.from('jobs')
      .select('scheduled_date, scheduled_time, estimated_duration, team_id')
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .neq('status', 'cancelled'),
    admin.from('cleaners')
      .select('team_id')
      .not('team_id', 'is', null),
  ])

  const totalTeams = new Set((cleaners ?? []).map(c => c.team_id).filter(Boolean)).size

  // If no teams are configured, report no blocked slots.
  if (totalTeams === 0) {
    return NextResponse.json({ bookedSlots: {} }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=15' },
    })
  }

  // Group jobs by date for fast lookup
  type JobEntry = { time: string; duration: number; teamId: string | null }
  const jobsByDate = new Map<string, JobEntry[]>()
  for (const j of jobs ?? []) {
    const date = j.scheduled_date as string
    const list = jobsByDate.get(date) ?? []
    list.push({
      time:     j.scheduled_time as string,
      duration: (j.estimated_duration as number) ?? DEFAULT_DURATION,
      teamId:   j.team_id as string | null,
    })
    jobsByDate.set(date, list)
  }

  const bookedSlots: Record<string, string[]> = {}

  for (const [date, dateJobs] of jobsByDate.entries()) {
    for (const slotTime of SLOT_TIMES_24H) {
      const slotStart = parseMinutes(slotTime)
      const slotEnd   = slotStart + DEFAULT_DURATION + 30

      // Count distinct teams that have a job overlapping this slot window
      const busyTeams = new Set<string>()
      for (const j of dateJobs) {
        if (!j.teamId) continue
        const jStart = parseMinutes(j.time)
        const jEnd   = jStart + j.duration + 30
        if (!(slotEnd <= jStart || slotStart >= jEnd)) {
          busyTeams.add(j.teamId)
        }
      }

      if (busyTeams.size >= totalTeams) {
        if (!bookedSlots[date]) bookedSlots[date] = []
        if (!bookedSlots[date].includes(slotTime)) bookedSlots[date].push(slotTime)
      }
    }
  }

  return NextResponse.json({ bookedSlots }, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=15' },
  })
}
