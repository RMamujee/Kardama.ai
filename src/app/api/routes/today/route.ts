import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type DailyRoute = {
  team_id: string
  segments: unknown
  legs: unknown
  stop_order: unknown
  total_drive_min: number
  total_km: number
  computed_at: string
}

// GET /api/routes/today?teamId=team-a   (optional — omit for all teams)
// Returns stored daily_routes for today. Respects RLS so cleaners only get their team.
// Mobile fetches this server-side; no Google API calls involved.

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const teamId = req.nextUrl.searchParams.get('teamId')

  let query = supabase
    .from('daily_routes')
    .select('team_id, segments, legs, stop_order, total_drive_min, total_km, computed_at')
    .eq('route_date', today)

  if (teamId) query = query.eq('team_id', teamId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as DailyRoute[]
  return NextResponse.json({
    routes: rows.map(r => ({
      teamId:       r.team_id,
      segments:     r.segments,
      legs:         r.legs,
      stopOrder:    r.stop_order,
      totalDriveMin: r.total_drive_min,
      totalKm:      r.total_km,
      computedAt:   r.computed_at,
    })),
  })
}
