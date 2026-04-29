import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/supabase/dal'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// La Crescenta coordinates
const LA_CRESCENTA = { lat: 34.2316, lng: -118.2342 }

const CLEANERS_TO_SEED = [
  {
    id: 'c_jalen',
    name: 'Profane 2',
    initials: 'P2',
    phone: '(747) 218-3437',
    email: 'profane2.real@kardama.ai',
    home_area_name: 'La Crescenta',
    home_area_lat: LA_CRESCENTA.lat,
    home_area_lng: LA_CRESCENTA.lng,
    color: '#8B5CF6',
    team_id: 'team-a',
  },
]

export async function POST() {
  try {
    await requireOwner()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  const results: string[] = []

  for (const c of CLEANERS_TO_SEED) {
    // Skip if already exists
    const { data: existing } = await admin
      .from('cleaners')
      .select('id')
      .eq('id', c.id)
      .maybeSingle()

    if (existing) {
      results.push(`${c.name}: already exists, skipped`)
      continue
    }

    const { error } = await admin.from('cleaners').insert({
      id: c.id,
      name: c.name,
      initials: c.initials,
      phone: c.phone,
      email: c.email,
      rating: 5.0,
      total_jobs: 0,
      current_lat: c.home_area_lat,
      current_lng: c.home_area_lng,
      home_area_name: c.home_area_name,
      home_area_lat: c.home_area_lat,
      home_area_lng: c.home_area_lng,
      status: 'available',
      available_hours: {
        Mon: { start: '08:00', end: '17:00' },
        Tue: { start: '08:00', end: '17:00' },
        Wed: { start: '08:00', end: '17:00' },
        Thu: { start: '08:00', end: '17:00' },
        Fri: { start: '08:00', end: '17:00' },
        Sat: null,
        Sun: null,
      },
      specialties: ['standard', 'deep-clean', 'move-out', 'airbnb'],
      reliability_score: 100,
      current_job_id: null,
      team_id: c.team_id,
      color: c.color,
    })

    if (error) {
      results.push(`${c.name}: ERROR — ${error.message}`)
    } else {
      results.push(`${c.name}: inserted ✓`)
    }
  }

  revalidatePath('/team')
  revalidatePath('/scheduling')
  revalidatePath('/map')

  return NextResponse.json({ results })
}
