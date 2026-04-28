import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('cleaner_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'cleaner' || !profile.cleaner_id) {
    return NextResponse.json({ error: 'Not a cleaner' }, { status: 403 })
  }

  const body = await req.json()
  const lat = Number(body.lat)
  const lng = Number(body.lng)

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const { error } = await supabase
    .from('cleaners')
    .update({ current_lat: lat, current_lng: lng })
    .eq('id', profile.cleaner_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
