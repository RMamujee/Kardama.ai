import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/seed-today
// Re-seeds the 10 demo jobs for today's date.
// Safe to run any time — deletes stale seed-* jobs and upserts fresh ones.

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'owner_operator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Ensure demo customers exist
  await admin.from('customers').upsert([
    { id: 'cust-live-01', name: 'Customer 1',  phone: '(310) 000-0001', email: 'customer1@private.local',  address: '1425 Artesia Blvd, Torrance, CA 90504',           lat: 33.8696, lng: -118.3534, city: 'Torrance',        source: 'referral', preferred_cleaner_ids: [], job_history: [], notes: 'Please use unscented products', total_spent: 0 },
    { id: 'cust-live-02', name: 'Customer 2',  phone: '(310) 000-0002', email: 'customer2@private.local',  address: '3250 Sepulveda Blvd, Torrance, CA 90503',        lat: 33.8527, lng: -118.3563, city: 'Torrance',        source: 'yelp',     preferred_cleaner_ids: [], job_history: [], notes: 'Dog in backyard — ignore barking', total_spent: 0 },
    { id: 'cust-live-03', name: 'Customer 3',  phone: '(310) 000-0003', email: 'customer3@private.local',  address: '2401 E 7th St, Long Beach, CA 90804',            lat: 33.7669, lng: -118.1694, city: 'Long Beach',     source: 'facebook', preferred_cleaner_ids: [], job_history: [], notes: 'Gate code: 4821', total_spent: 0 },
    { id: 'cust-live-04', name: 'Customer 4',  phone: '(562) 000-0004', email: 'customer4@private.local',  address: '900 E Ocean Blvd, Long Beach, CA 90802',         lat: 33.7626, lng: -118.1877, city: 'Long Beach',     source: 'referral', preferred_cleaner_ids: [], job_history: [], notes: 'Leave key under mat after', total_spent: 0 },
    { id: 'cust-live-05', name: 'Customer 5',  phone: '(310) 000-0005', email: 'customer5@private.local',  address: '4444 W 168th St, Lawndale, CA 90260',            lat: 33.8848, lng: -118.3533, city: 'Lawndale',       source: 'yelp',     preferred_cleaner_ids: [], job_history: [], notes: '', total_spent: 0 },
    { id: 'cust-live-06', name: 'Customer 6',  phone: '(310) 000-0006', email: 'customer6@private.local',  address: '3300 Sepulveda Blvd, Manhattan Beach, CA 90266', lat: 33.8862, lng: -118.3943, city: 'Manhattan Beach', source: 'repeat',   preferred_cleaner_ids: [], job_history: [], notes: 'Monthly deep-clean regular', total_spent: 0 },
    { id: 'cust-live-07', name: 'Customer 7',  phone: '(310) 000-0007', email: 'customer7@private.local',  address: '830 S Prairie Ave, Inglewood, CA 90301',         lat: 33.9548, lng: -118.3388, city: 'Inglewood',      source: 'facebook', preferred_cleaner_ids: [], job_history: [], notes: '', total_spent: 0 },
    { id: 'cust-live-08', name: 'Customer 8',  phone: '(310) 000-0008', email: 'customer8@private.local',  address: '400 S La Brea Ave, Inglewood, CA 90301',         lat: 33.9604, lng: -118.3457, city: 'Inglewood',      source: 'yelp',     preferred_cleaner_ids: [], job_history: [], notes: 'Buzz apartment 3B', total_spent: 0 },
    { id: 'cust-live-09', name: 'Customer 9',  phone: '(310) 000-0009', email: 'customer9@private.local',  address: '531 N Sepulveda Blvd, El Segundo, CA 90245',     lat: 33.9285, lng: -118.4155, city: 'El Segundo',     source: 'referral', preferred_cleaner_ids: [], job_history: [], notes: 'Weekly standard service', total_spent: 0 },
    { id: 'cust-live-10', name: 'Customer 10', phone: '(310) 000-0010', email: 'customer10@private.local', address: '1600 Rosecrans Ave, Manhattan Beach, CA 90266',  lat: 33.8862, lng: -118.3928, city: 'Manhattan Beach', source: 'repeat',   preferred_cleaner_ids: [], job_history: [], notes: 'Has 3 cats', total_spent: 0 },
  ], { onConflict: 'id' })

  // Remove stale seed jobs (from previous days)
  await admin.from('jobs').delete().like('id', 'seed-%')

  // Insert today's seed jobs with correct team_id
  const { error } = await admin.from('jobs').insert([
    { id: 'seed-job-a1', customer_id: 'cust-live-01', cleaner_ids: ['c1','c2'], team_id: 'team-a', scheduled_date: today, scheduled_time: '09:00', estimated_duration: 120, status: 'confirmed',  service_type: 'standard',  price: 175, paid: false, address: '1425 Artesia Blvd, Torrance, CA 90504',           lat: 33.8696, lng: -118.3534, notes: '',                  drive_time_minutes: 18 },
    { id: 'seed-job-a2', customer_id: 'cust-live-02', cleaner_ids: ['c1','c2'], team_id: 'team-a', scheduled_date: today, scheduled_time: '11:30', estimated_duration:  90, status: 'scheduled',  service_type: 'deep',      price: 225, paid: false, address: '3250 Sepulveda Blvd, Torrance, CA 90503',        lat: 33.8527, lng: -118.3563, notes: '',                  drive_time_minutes: 12 },
    { id: 'seed-job-b1', customer_id: 'cust-live-03', cleaner_ids: ['c3','c4'], team_id: 'team-b', scheduled_date: today, scheduled_time: '09:00', estimated_duration:  90, status: 'confirmed',  service_type: 'standard',  price: 150, paid: false, address: '2401 E 7th St, Long Beach, CA 90804',            lat: 33.7669, lng: -118.1694, notes: 'Gate code: 4821',  drive_time_minutes: 20 },
    { id: 'seed-job-b2', customer_id: 'cust-live-04', cleaner_ids: ['c3','c4'], team_id: 'team-b', scheduled_date: today, scheduled_time: '11:00', estimated_duration: 120, status: 'scheduled',  service_type: 'airbnb',    price: 200, paid: false, address: '900 E Ocean Blvd, Long Beach, CA 90802',         lat: 33.7626, lng: -118.1877, notes: '',                  drive_time_minutes: 15 },
    { id: 'seed-job-c1', customer_id: 'cust-live-05', cleaner_ids: ['c5','c6'], team_id: 'team-c', scheduled_date: today, scheduled_time: '09:00', estimated_duration: 120, status: 'confirmed',  service_type: 'standard',  price: 175, paid: false, address: '4444 W 168th St, Lawndale, CA 90260',            lat: 33.8848, lng: -118.3533, notes: '',                  drive_time_minutes: 10 },
    { id: 'seed-job-c2', customer_id: 'cust-live-06', cleaner_ids: ['c5','c6'], team_id: 'team-c', scheduled_date: today, scheduled_time: '11:30', estimated_duration: 150, status: 'scheduled',  service_type: 'deep',      price: 275, paid: false, address: '3300 Sepulveda Blvd, Manhattan Beach, CA 90266', lat: 33.8862, lng: -118.3943, notes: 'Monthly regular',  drive_time_minutes: 22 },
    { id: 'seed-job-d1', customer_id: 'cust-live-07', cleaner_ids: ['c7','c8'], team_id: 'team-d', scheduled_date: today, scheduled_time: '09:00', estimated_duration:  90, status: 'confirmed',  service_type: 'standard',  price: 150, paid: false, address: '830 S Prairie Ave, Inglewood, CA 90301',         lat: 33.9548, lng: -118.3388, notes: '',                  drive_time_minutes:  8 },
    { id: 'seed-job-d2', customer_id: 'cust-live-08', cleaner_ids: ['c7','c8'], team_id: 'team-d', scheduled_date: today, scheduled_time: '11:00', estimated_duration: 120, status: 'scheduled',  service_type: 'deep',      price: 225, paid: false, address: '400 S La Brea Ave, Inglewood, CA 90301',         lat: 33.9604, lng: -118.3457, notes: 'Buzz 3B',           drive_time_minutes: 14 },
    { id: 'seed-job-e1', customer_id: 'cust-live-09', cleaner_ids: ['c9','c10'], team_id: 'team-e', scheduled_date: today, scheduled_time: '09:00', estimated_duration:  60, status: 'confirmed', service_type: 'standard',  price: 125, paid: false, address: '531 N Sepulveda Blvd, El Segundo, CA 90245',     lat: 33.9285, lng: -118.4155, notes: 'Weekly service',   drive_time_minutes:  5 },
    { id: 'seed-job-e2', customer_id: 'cust-live-10', cleaner_ids: ['c9','c10'], team_id: 'team-e', scheduled_date: today, scheduled_time: '10:30', estimated_duration: 120, status: 'scheduled', service_type: 'standard',  price: 175, paid: false, address: '1600 Rosecrans Ave, Manhattan Beach, CA 90266',  lat: 33.8862, lng: -118.3928, notes: 'Has 3 cats',        drive_time_minutes: 18 },
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clear stale daily_routes cache for today so the next compute call is fresh
  await admin.from('daily_routes').delete().eq('route_date', today)

  return NextResponse.json({ seeded: 10, date: today })
}
