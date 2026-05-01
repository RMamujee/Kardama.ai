import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/fix-coords
// Re-geocodes every job and customer whose lat/lng is still the old
// placeholder default (33.85, -118.33) or exactly (0, 0).
// Safe to run multiple times — skips records that already have real coords.

const BAD_LAT = 33.85
const BAD_LNG = -118.33

function cleanAddr(address: string) {
  return address.replace(/, USA$/i, '').replace(/(-[A-Za-z]+)(,)/, '$2').trim()
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = cleanAddr(address)
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (key) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}`, { cache: 'no-store' })
      const data = await res.json()
      const loc = data.results?.[0]?.geometry?.location as { lat: number; lng: number } | undefined
      if (loc) return loc
    } catch {}
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Kardama-Admin/1.0' }, cache: 'no-store' })
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

function isBad(lat: number, lng: number) {
  return (lat === 0 && lng === 0) ||
    (Math.abs(lat - BAD_LAT) < 0.001 && Math.abs(lng - BAD_LNG) < 0.001)
}

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'owner_operator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdminClient()
  const results: { id: string; address: string; old: string; new: string; ok: boolean }[] = []

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const { data: jobs } = await admin.from('jobs').select('id, address, lat, lng')
  for (const job of jobs ?? []) {
    const { id, address, lat, lng } = job as { id: string; address: string; lat: number; lng: number }
    if (!isBad(Number(lat), Number(lng))) continue
    const coords = await geocode(address)
    const entry = { id, address, old: `${lat},${lng}`, new: coords ? `${coords.lat},${coords.lng}` : 'failed', ok: !!coords }
    if (coords) {
      await admin.from('jobs').update({ lat: coords.lat, lng: coords.lng }).eq('id', id)
    }
    results.push(entry)
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  const { data: customers } = await admin.from('customers').select('id, address, lat, lng')
  for (const cust of customers ?? []) {
    const { id, address, lat, lng } = cust as { id: string; address: string; lat: number; lng: number }
    if (!isBad(Number(lat), Number(lng))) continue
    const coords = await geocode(address)
    const entry = { id, address, old: `${lat},${lng}`, new: coords ? `${coords.lat},${coords.lng}` : 'failed', ok: !!coords }
    if (coords) {
      await admin.from('customers').update({ lat: coords.lat, lng: coords.lng }).eq('id', id)
    }
    results.push(entry)
  }

  return NextResponse.json({ fixed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results })
}
