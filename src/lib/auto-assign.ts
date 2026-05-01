import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { estimateDriveMinutes } from './drive-time'
import { SERVICE_PRICES, SERVICE_DURATIONS } from './services'
import type { Cleaner, Job } from '@/types'

const DEFAULT_COORDS: [number, number] = [33.85, -118.33]

async function geocodeAddress(address: string, city: string | null): Promise<[number, number]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return DEFAULT_COORDS
  const query = [address, city].filter(Boolean).join(', ')
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    const loc = data.results?.[0]?.geometry?.location as { lat: number; lng: number } | undefined
    if (loc) return [loc.lat, loc.lng]
  } catch {}
  return DEFAULT_COORDS
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getDayName(dateStr: string): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr + 'T12:00:00').getDay()]
}


// 'deep' in service_type maps to 'deep-clean' in cleaner specialties
function serviceToSpecialty(s: string): string {
  return s === 'deep' ? 'deep-clean' : s
}

type CleanerRow = {
  id: string; name: string; initials: string; phone: string; email: string
  rating: number; total_jobs: number; current_lat: number; current_lng: number
  home_area_name: string; home_area_lat: number; home_area_lng: number
  status: Cleaner['status']; available_hours: Cleaner['availableHours']
  specialties: Cleaner['specialties']; reliability_score: number
  current_job_id: string | null; team_id: string | null; color: string
}

type JobRow = {
  id: string; cleaner_ids: string[]
  scheduled_date: string; scheduled_time: string
  estimated_duration: number; status: string
}

function mapCleaner(r: CleanerRow): Cleaner {
  return {
    id: r.id, name: r.name, initials: r.initials, phone: r.phone, email: r.email,
    rating: Number(r.rating), totalJobs: r.total_jobs,
    currentLat: Number(r.current_lat), currentLng: Number(r.current_lng),
    homeAreaName: r.home_area_name, homeAreaLat: Number(r.home_area_lat), homeAreaLng: Number(r.home_area_lng),
    status: r.status, availableHours: r.available_hours,
    specialties: r.specialties, reliabilityScore: r.reliability_score,
    currentJobId: r.current_job_id, teamId: r.team_id ?? '', color: r.color,
  }
}

export type AutoAssignResult = {
  jobId: string
  customerId: string
  cleanerIds: string[]
  teamId: string
  cleanerNames: string[]
}

export async function autoAssignBookingRequest(params: {
  bookingRequestId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  address: string
  city: string | null
  serviceType: string
  preferredDate: string
  preferredTime: string
  notes?: string
}): Promise<AutoAssignResult | null> {
  const admin = getSupabaseAdminClient()

  const [[jobLat, jobLng], cleanersRes, jobsRes] = await Promise.all([
    geocodeAddress(params.address, params.city),
    admin.from('cleaners').select('*'),
    admin.from('jobs').select('id,cleaner_ids,scheduled_date,scheduled_time,estimated_duration,status')
      .in('status', ['scheduled', 'confirmed', 'in-progress']),
  ])

  const cleaners: Cleaner[] = (cleanersRes.data ?? []).map(r => mapCleaner(r as CleanerRow))
  const activeJobs: JobRow[] = (jobsRes.data ?? []) as JobRow[]

  if (cleaners.length === 0) return null
  const duration = SERVICE_DURATIONS[params.serviceType] ?? 150
  const slotStart = parseMinutes(params.preferredTime)
  const slotEnd = slotStart + duration + 30
  const day = getDayName(params.preferredDate)
  const specialty = serviceToSpecialty(params.serviceType)

  // Derive team map from cleaners' teamId
  const teamMap = new Map<string, Cleaner[]>()
  for (const c of cleaners) {
    if (c.teamId) {
      const list = teamMap.get(c.teamId) ?? []
      list.push(c)
      teamMap.set(c.teamId, list)
    }
  }

  type Scored = { teamId: string; cleanerIds: string[]; cleanerNames: string[]; score: number; driveMin: number }
  const scored: Scored[] = []

  for (const [teamId, teamCleaners] of teamMap.entries()) {
    if (teamCleaners.length < 1) continue

    let allAvailable = true
    let totalDrive = 0
    let totalScore = 0

    for (const c of teamCleaners) {
      const hours = c.availableHours[day]
      if (!hours) { allAvailable = false; break }

      const avStart = parseMinutes(hours.start)
      const avEnd = parseMinutes(hours.end)
      if (slotStart < avStart || slotEnd > avEnd) { allAvailable = false; break }

      const conflict = activeJobs.some(j => {
        if (!j.cleaner_ids.includes(c.id) || j.scheduled_date !== params.preferredDate) return false
        const jStart = parseMinutes(j.scheduled_time)
        const jEnd = jStart + (j.estimated_duration ?? 150) + 30
        return !(slotEnd <= jStart || slotStart >= jEnd)
      })
      if (conflict) { allAvailable = false; break }

      const drive = estimateDriveMinutes(c.homeAreaLat, c.homeAreaLng, jobLat, jobLng)
      totalDrive += drive
      const proxScore = Math.max(0, 100 - drive * 2)
      const relScore = c.reliabilityScore
      const specScore = c.specialties.includes(specialty as Cleaner['specialties'][number]) ? 100 : 50
      totalScore += 0.5 * proxScore + 0.3 * relScore + 0.2 * specScore
    }

    if (!allAvailable) continue

    const n = teamCleaners.length
    scored.push({
      teamId,
      cleanerIds: teamCleaners.map(c => c.id),
      cleanerNames: teamCleaners.map(c => c.name),
      score: Math.round(totalScore / n),
      driveMin: Math.round(totalDrive / n),
    })
  }

  if (scored.length === 0) return null
  const best = scored.sort((a, b) => b.score - a.score)[0]

  // Find or create customer
  const email = params.customerEmail.toLowerCase()
  const { data: existing } = await admin.from('customers').select('id').eq('email', email).maybeSingle()
  let customerId: string

  if (existing) {
    customerId = existing.id
  } else {
    customerId = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    await admin.from('customers').insert({
      id: customerId,
      name: params.customerName,
      phone: params.customerPhone,
      email,
      address: params.address,
      city: params.city ?? '',
      lat: jobLat,
      lng: jobLng,
      source: 'referral' as const,
      preferred_cleaner_ids: [],
      job_history: [],
      notes: '',
      total_spent: 0,
    })
  }

  type ServiceType = 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb'
  const validServiceTypes = new Set<string>(['standard', 'deep', 'move-out', 'post-construction', 'airbnb'])
  const serviceType = validServiceTypes.has(params.serviceType)
    ? params.serviceType as ServiceType
    : 'standard' as ServiceType

  // Create job
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const { error: jobErr } = await admin.from('jobs').insert({
    id: jobId,
    customer_id: customerId,
    cleaner_ids: best.cleanerIds,
    team_id: best.teamId,
    scheduled_date: params.preferredDate,
    scheduled_time: params.preferredTime,
    estimated_duration: duration,
    actual_duration: null,
    status: 'scheduled',
    service_type: serviceType,
    price: SERVICE_PRICES[params.serviceType] ?? 165,
    paid: false,
    payment_method: null,
    payment_confirmation_id: null,
    address: params.address,
    lat: jobLat,
    lng: jobLng,
    notes: params.notes ?? '',
    drive_time_minutes: best.driveMin,
  })

  if (jobErr) {
    console.error('auto-assign: job insert failed', jobErr)
    return null
  }

  // Mark booking request as accepted + converted
  await admin.from('booking_requests').update({
    status: 'accepted',
    converted_customer_id: customerId,
    converted_job_id: jobId,
  }).eq('id', params.bookingRequestId)

  return { jobId, customerId, cleanerIds: best.cleanerIds, teamId: best.teamId, cleanerNames: best.cleanerNames }
}
