'use server'
import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/supabase/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/twilio'
import { SERVICE_PRICES, SERVICE_DURATIONS } from '@/lib/services'
import type { SupabaseClient } from '@supabase/supabase-js'

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function fmtClock(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

// Returns a description of a conflicting job if the given team is busy during
// the proposed window, otherwise null. Excludes `excludeJobId` (use when editing).
async function findTeamConflict(
  supabase: SupabaseClient,
  teamId: string,
  date: string,
  time: string,
  durationMin: number,
  excludeJobId?: string,
): Promise<{ address: string; start: string; end: string } | null> {
  const { data: teamCleaners } = await supabase
    .from('cleaners')
    .select('id')
    .eq('team_id', teamId)
  if (!teamCleaners || teamCleaners.length === 0) return null
  const teamIds = new Set(teamCleaners.map(c => c.id as string))

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, scheduled_time, estimated_duration, cleaner_ids, address, status')
    .eq('scheduled_date', date)
    .neq('status', 'cancelled')
  if (!jobs || jobs.length === 0) return null

  const proposedStart = toMinutes(time)
  const proposedEnd = proposedStart + durationMin + 30

  for (const j of jobs) {
    if (excludeJobId && j.id === excludeJobId) continue
    const ids = (j.cleaner_ids as string[] | null) ?? []
    if (!ids.some(id => teamIds.has(id))) continue
    const start = toMinutes(j.scheduled_time as string)
    const end = start + ((j.estimated_duration as number | null) ?? 180)
    if (start < proposedEnd && proposedStart < end) {
      return {
        address: (j.address as string | null) ?? '',
        start: fmtClock(start),
        end: fmtClock(end),
      }
    }
  }
  return null
}

async function teamIdForCleaner(supabase: SupabaseClient, cleanerId: string): Promise<string | null> {
  const { data } = await supabase.from('cleaners').select('team_id').eq('id', cleanerId).maybeSingle()
  return (data?.team_id as string | undefined) ?? null
}

export async function createJob(data: {
  customerId: string
  cleanerIds: string[]
  scheduledDate: string
  scheduledTime: string
  estimatedDuration: number
  serviceType: 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb'
  price: number
  address: string
  lat: number
  lng: number
  notes: string
  driveTimeMinutes: number
}): Promise<string> {
  await requireOwner()
  const supabase = await createSupabaseServerClient()

  let resolvedTeamId: string | null = null
  if (data.cleanerIds.length > 0) {
    resolvedTeamId = await teamIdForCleaner(supabase, data.cleanerIds[0])
    if (resolvedTeamId) {
      const conflict = await findTeamConflict(
        supabase, resolvedTeamId, data.scheduledDate, data.scheduledTime, data.estimatedDuration,
      )
      if (conflict) {
        const where = conflict.address ? ` at ${conflict.address.split(',')[0]}` : ''
        throw new Error(`Team is already booked${where} from ${conflict.start} to ${conflict.end}.`)
      }
    }
  }

  const id = genId('j')
  const { error } = await supabase.from('jobs').insert({
    id,
    customer_id: data.customerId,
    cleaner_ids: data.cleanerIds,
    scheduled_date: data.scheduledDate,
    scheduled_time: data.scheduledTime,
    estimated_duration: data.estimatedDuration,
    actual_duration: null,
    status: 'scheduled' as const,
    service_type: data.serviceType,
    price: data.price,
    paid: false,
    payment_method: null,
    payment_confirmation_id: null,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    notes: data.notes,
    drive_time_minutes: data.driveTimeMinutes,
    team_id: resolvedTeamId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/scheduling')
  return id
}

// Converts a pending booking_request into a scheduled job assigned to the
// chosen team. Creates a customer row if none exists for that email.
// Throws if the team has an overlapping job at the resolved date/time.
export async function acceptBookingRequest(requestId: string, teamId: string): Promise<void> {
  await requireOwner()
  if (!teamId) throw new Error('A team must be selected before scheduling.')
  const supabase = await createSupabaseServerClient()

  const { data: req, error: reqErr } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (reqErr || !req) throw new Error('Booking request not found')

  // Fall back to tomorrow + 9 AM if the intake form didn't capture a specific slot
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const scheduledDate = req.preferred_date ?? tomorrow.toISOString().split('T')[0]
  const scheduledTime = req.preferred_time ?? '09:00'
  const duration = SERVICE_DURATIONS[req.service_type] ?? 180

  // Resolve the team's cleaners and reject if the team has no members
  const { data: teamCleaners } = await supabase
    .from('cleaners').select('id').eq('team_id', teamId)
  if (!teamCleaners || teamCleaners.length === 0) {
    throw new Error('Selected team has no cleaners assigned.')
  }
  const cleanerIds = teamCleaners.map(c => c.id as string)

  // Block double-booking
  const conflict = await findTeamConflict(supabase, teamId, scheduledDate, scheduledTime, duration)
  if (conflict) {
    const where = conflict.address ? ` at ${conflict.address.split(',')[0]}` : ''
    throw new Error(`That team is already booked${where} from ${conflict.start} to ${conflict.end}.`)
  }

  // Find or create the customer
  let customerId: string
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', req.customer_email)
    .maybeSingle()

  if (existing) {
    customerId = existing.id
  } else {
    customerId = genId('cust')
    const { error: custErr } = await supabase.from('customers').insert({
      id: customerId,
      name: req.customer_name,
      phone: req.customer_phone,
      email: req.customer_email,
      address: req.address,
      lat: 0,
      lng: 0,
      city: req.city ?? '',
      preferred_cleaner_ids: [],
      job_history: [],
      source: 'text' as const,
      notes: req.notes,
      total_spent: 0,
    })
    if (custErr) throw new Error(custErr.message)
  }

  // Create the job
  const jobId = genId('j')
  const { error: jobErr } = await supabase.from('jobs').insert({
    id: jobId,
    customer_id: customerId,
    cleaner_ids: cleanerIds,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    estimated_duration: duration,
    actual_duration: null,
    status: 'scheduled' as const,
    service_type: req.service_type,
    price: SERVICE_PRICES[req.service_type] ?? 165,
    paid: false,
    payment_method: null,
    payment_confirmation_id: null,
    address: req.address,
    lat: 0,
    lng: 0,
    notes: req.notes,
    drive_time_minutes: 0,
    team_id: teamId,
  })
  if (jobErr) throw new Error(jobErr.message)

  await supabase.from('booking_requests').update({
    status: 'converted' as const,
    converted_customer_id: customerId,
    converted_job_id: jobId,
  }).eq('id', requestId)

  // Confirmation SMS to the customer — non-fatal, never blocks scheduling
  if (req.customer_phone) {
    const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Your cleaner'
    const when = formatWhen(scheduledDate, scheduledTime)
    const body = `${businessName}: You're confirmed for ${when} at ${req.address}. Reply to this text with any questions.`
    sendSms(req.customer_phone, body).catch(e => console.error('Confirmation SMS failed:', e))
  }

  revalidatePath('/scheduling')
}

function formatWhen(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${dateStr} at ${time}`
}

export async function declineBookingRequest(requestId: string): Promise<void> {
  await requireOwner()
  const supabase = await createSupabaseServerClient()

  // Fetch full request for job cleanup + decline email
  const { data: req } = await supabase
    .from('booking_requests')
    .select('converted_job_id, customer_name, customer_email, customer_phone, service_type, preferred_date, address')
    .eq('id', requestId)
    .maybeSingle()

  if (req?.converted_job_id) {
    await supabase.from('jobs').delete().eq('id', req.converted_job_id)
  }

  await supabase.from('booking_requests').update({ status: 'declined' as const }).eq('id', requestId)

  // Notify customer via n8n — non-fatal
  const n8nDeclineWebhook = process.env.N8N_BOOKING_DECLINED_WEBHOOK_URL
  if (n8nDeclineWebhook && req?.customer_email) {
    fetch(n8nDeclineWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: req.customer_name,
        customerEmail: req.customer_email,
        customerPhone: req.customer_phone,
        serviceType: req.service_type,
        preferredDate: req.preferred_date,
        address: req.address,
      }),
    }).catch(e => console.error('n8n booking declined webhook failed:', e))
  }

  revalidatePath('/scheduling')
  revalidatePath('/dashboard')
  revalidatePath('/map')
}

export async function deleteJob(jobId: string): Promise<void> {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('jobs').delete().eq('id', jobId)
  if (error) throw new Error(error.message)
  revalidatePath('/scheduling')
  revalidatePath('/dashboard')
  revalidatePath('/map')
}

export async function updateJob(
  jobId: string,
  patch: Partial<{
    scheduledDate: string
    scheduledTime: string
    estimatedDuration: number
    serviceType: string
    status: string
    price: number
    cleanerIds: string[]
    notes: string
  }>,
): Promise<void> {
  await requireOwner()
  const supabase = await createSupabaseServerClient()

  // Need current job state to evaluate conflicts when only some fields change
  const { data: current, error: curErr } = await supabase
    .from('jobs')
    .select('scheduled_date, scheduled_time, estimated_duration, cleaner_ids')
    .eq('id', jobId)
    .single()
  if (curErr || !current) throw new Error('Job not found')

  const nextDate     = patch.scheduledDate     ?? (current.scheduled_date as string)
  const nextTime     = patch.scheduledTime     ?? (current.scheduled_time as string)
  const nextDuration = patch.estimatedDuration ?? ((current.estimated_duration as number | null) ?? 180)
  const nextCleaners = patch.cleanerIds        ?? ((current.cleaner_ids as string[] | null) ?? [])

  if (nextCleaners.length > 0) {
    const teamId = await teamIdForCleaner(supabase, nextCleaners[0])
    if (teamId) {
      const conflict = await findTeamConflict(supabase, teamId, nextDate, nextTime, nextDuration, jobId)
      if (conflict) {
        const where = conflict.address ? ` at ${conflict.address.split(',')[0]}` : ''
        throw new Error(`That team is already booked${where} from ${conflict.start} to ${conflict.end}.`)
      }
    }
  }

  const { error } = await supabase.from('jobs').update({
    ...(patch.scheduledDate    !== undefined && { scheduled_date:    patch.scheduledDate }),
    ...(patch.scheduledTime    !== undefined && { scheduled_time:    patch.scheduledTime }),
    ...(patch.estimatedDuration !== undefined && { estimated_duration: patch.estimatedDuration }),
    ...(patch.serviceType      !== undefined && { service_type:      patch.serviceType as 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb' }),
    ...(patch.status           !== undefined && { status:            patch.status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled' }),
    ...(patch.price            !== undefined && { price:             patch.price }),
    ...(patch.cleanerIds       !== undefined && { cleaner_ids:       patch.cleanerIds }),
    ...(patch.notes            !== undefined && { notes:             patch.notes }),
  }).eq('id', jobId)
  if (error) throw new Error(error.message)

  revalidatePath('/scheduling')
  revalidatePath('/map')
  revalidatePath('/dashboard')
}
