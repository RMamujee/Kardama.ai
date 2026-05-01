import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/debug-map  — temporary diagnostics, owner-only
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'owner_operator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdminClient()

  const [{ data: cleaners }, { data: jobs }] = await Promise.all([
    admin.from('cleaners').select('id, name, team_id, current_lat, current_lng, home_area_lat, home_area_lng, color'),
    admin.from('jobs').select('id, scheduled_date, scheduled_time, status, team_id, cleaner_ids, lat, lng, address').order('scheduled_date').order('scheduled_time'),
  ])

  const today = new Date().toISOString().split('T')[0]
  const todayJobs = (jobs ?? []).filter((j: Record<string, unknown>) => j.scheduled_date === today)

  return NextResponse.json({
    today,
    cleaners: (cleaners ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      team_id: c.team_id,
      home_area_lat: c.home_area_lat,
      home_area_lng: c.home_area_lng,
      current_lat: c.current_lat,
      current_lng: c.current_lng,
      color: c.color,
    })),
    todayJobs: todayJobs.map((j: Record<string, unknown>) => ({
      id: j.id,
      address: j.address,
      scheduled_time: j.scheduled_time,
      status: j.status,
      team_id: j.team_id,
      cleaner_ids: j.cleaner_ids,
      lat: j.lat,
      lng: j.lng,
    })),
    allJobCount: (jobs ?? []).length,
    todayJobCount: todayJobs.length,
  })
}
