// Seed Supabase with the existing mock data.
// Run after migrations have been applied:
//   npm run db:seed
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from '@supabase/supabase-js'
import { CLEANERS, CUSTOMERS, JOBS, PAYMENTS } from '../src/lib/mock-data'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function seed() {
  console.log('Seeding cleaners…')
  const { error: cleanersErr } = await admin.from('cleaners').upsert(
    CLEANERS.map(c => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      phone: c.phone,
      email: c.email,
      rating: c.rating,
      total_jobs: c.totalJobs,
      current_lat: c.currentLat,
      current_lng: c.currentLng,
      home_area_name: c.homeAreaName,
      home_area_lat: c.homeAreaLat,
      home_area_lng: c.homeAreaLng,
      status: c.status,
      available_hours: c.availableHours,
      specialties: c.specialties,
      reliability_score: c.reliabilityScore,
      current_job_id: c.currentJobId,
      team_id: c.teamId,
      color: c.color,
    })),
  )
  if (cleanersErr) throw cleanersErr

  console.log('Seeding customers…')
  const { error: customersErr } = await admin.from('customers').upsert(
    CUSTOMERS.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      lat: c.lat,
      lng: c.lng,
      city: c.city,
      preferred_cleaner_ids: c.preferredCleanerIds,
      job_history: c.jobHistory,
      source: c.source,
      notes: c.notes,
      total_spent: c.totalSpent,
      created_at: c.createdAt,
    })),
  )
  if (customersErr) throw customersErr

  console.log('Seeding jobs…')
  const { error: jobsErr } = await admin.from('jobs').upsert(
    JOBS.map(j => ({
      id: j.id,
      customer_id: j.customerId,
      cleaner_ids: j.cleanerIds,
      scheduled_date: j.scheduledDate,
      scheduled_time: j.scheduledTime,
      estimated_duration: j.estimatedDuration,
      actual_duration: j.actualDuration ?? null,
      status: j.status,
      service_type: j.serviceType,
      price: j.price,
      paid: j.paid,
      payment_method: j.paymentMethod ?? null,
      payment_confirmation_id: j.paymentConfirmationId ?? null,
      address: j.address,
      lat: j.lat,
      lng: j.lng,
      notes: j.notes,
      drive_time_minutes: j.driveTimeMinutes,
      created_at: j.createdAt,
    })),
  )
  if (jobsErr) throw jobsErr

  console.log('Seeding payments…')
  const { error: paymentsErr } = await admin.from('payments').upsert(
    PAYMENTS.map(p => ({
      id: p.id,
      job_id: p.jobId,
      customer_id: p.customerId,
      cleaner_ids: p.cleanerIds,
      amount: p.amount,
      method: p.method,
      status: p.status,
      confirmation_note: p.confirmationNote,
      received_at: p.receivedAt,
      month: p.month,
    })),
  )
  if (paymentsErr) throw paymentsErr

  console.log(`✓ Seeded ${CLEANERS.length} cleaners, ${CUSTOMERS.length} customers, ${JOBS.length} jobs, ${PAYMENTS.length} payments`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
