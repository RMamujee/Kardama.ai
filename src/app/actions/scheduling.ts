'use server'
import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/supabase/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const SERVICE_PRICES: Record<string, number> = {
  standard: 165, deep: 245, 'move-out': 380, 'post-construction': 450, airbnb: 195,
}
const SERVICE_DURATIONS: Record<string, number> = {
  standard: 180, deep: 240, 'move-out': 300, 'post-construction': 360, airbnb: 120,
}

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
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
  })
  if (error) throw new Error(error.message)
  revalidatePath('/scheduling')
  return id
}

// Converts a pending booking_request into a scheduled job.
// Creates a customer row if none exists for that email.
export async function acceptBookingRequest(requestId: string): Promise<void> {
  await requireOwner()
  const supabase = await createSupabaseServerClient()

  const { data: req, error: reqErr } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (reqErr || !req) throw new Error('Booking request not found')
  if (!req.preferred_date || !req.preferred_time) {
    throw new Error('Request is missing a preferred date or time')
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
    cleaner_ids: [],
    scheduled_date: req.preferred_date,
    scheduled_time: req.preferred_time,
    estimated_duration: SERVICE_DURATIONS[req.service_type] ?? 180,
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
  })
  if (jobErr) throw new Error(jobErr.message)

  await supabase.from('booking_requests').update({
    status: 'converted' as const,
    converted_customer_id: customerId,
    converted_job_id: jobId,
  }).eq('id', requestId)

  revalidatePath('/scheduling')
}

export async function declineBookingRequest(requestId: string): Promise<void> {
  await requireOwner()
  const supabase = await createSupabaseServerClient()
  await supabase.from('booking_requests').update({ status: 'declined' as const }).eq('id', requestId)
  revalidatePath('/scheduling')
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
