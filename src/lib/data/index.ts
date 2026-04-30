import 'server-only'
import { cache } from 'react'
import type { Cleaner, Customer, Job, Payment, Team, SocialLead } from '@/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ─────────── row → domain mappers ───────────
type CleanerRow = {
  id: string; name: string; initials: string; phone: string; email: string
  rating: number; total_jobs: number; current_lat: number; current_lng: number
  home_area_name: string; home_area_lat: number; home_area_lng: number
  status: Cleaner['status']; available_hours: Cleaner['availableHours']
  specialties: Cleaner['specialties']; reliability_score: number
  current_job_id: string | null; team_id: string | null; color: string
}
function mapCleaner(r: CleanerRow): Cleaner {
  return {
    id: r.id, name: r.name, initials: r.initials, phone: r.phone, email: r.email,
    rating: Number(r.rating), totalJobs: r.total_jobs,
    currentLat: Number(r.current_lat), currentLng: Number(r.current_lng),
    homeAreaName: r.home_area_name,
    homeAreaLat: Number(r.home_area_lat), homeAreaLng: Number(r.home_area_lng),
    status: r.status, availableHours: r.available_hours,
    specialties: r.specialties, reliabilityScore: r.reliability_score,
    currentJobId: r.current_job_id, teamId: r.team_id ?? '', color: r.color,
  }
}

type CustomerRow = {
  id: string; name: string; phone: string; email: string; address: string
  lat: number; lng: number; city: string
  preferred_cleaner_ids: string[]; job_history: string[]
  source: Customer['source']; notes: string; total_spent: number; created_at: string
}
function mapCustomer(r: CustomerRow): Customer {
  return {
    id: r.id, name: r.name, phone: r.phone, email: r.email, address: r.address,
    lat: Number(r.lat), lng: Number(r.lng), city: r.city,
    preferredCleanerIds: r.preferred_cleaner_ids, jobHistory: r.job_history,
    source: r.source, notes: r.notes, totalSpent: Number(r.total_spent),
    createdAt: r.created_at?.slice(0, 10) ?? '',
  }
}

type JobRow = {
  id: string; customer_id: string; cleaner_ids: string[]
  scheduled_date: string; scheduled_time: string
  estimated_duration: number; actual_duration: number | null
  status: Job['status']; service_type: Job['serviceType']
  price: number; paid: boolean
  payment_method: Job['paymentMethod'] | null; payment_confirmation_id: string | null
  address: string; lat: number; lng: number; notes: string
  drive_time_minutes: number; created_at: string
  team_id: string | null
}
function mapJob(r: JobRow): Job {
  return {
    id: r.id, customerId: r.customer_id, cleanerIds: r.cleaner_ids,
    scheduledDate: r.scheduled_date, scheduledTime: r.scheduled_time,
    estimatedDuration: r.estimated_duration,
    actualDuration: r.actual_duration ?? undefined,
    status: r.status, serviceType: r.service_type,
    price: Number(r.price), paid: r.paid,
    paymentMethod: r.payment_method ?? undefined,
    paymentConfirmationId: r.payment_confirmation_id ?? undefined,
    address: r.address, lat: Number(r.lat), lng: Number(r.lng), notes: r.notes,
    driveTimeMinutes: r.drive_time_minutes,
    createdAt: r.created_at?.slice(0, 10) ?? '',
    teamId: r.team_id,
  }
}

type TeamRow = { id: string; name: string; color: string; archived: boolean }
function mapTeam(r: TeamRow): Team {
  return { id: r.id, name: r.name, color: r.color, archived: r.archived }
}

type PaymentRow = {
  id: string; job_id: string | null; booking_ref: string | null; customer_id: string | null; cleaner_ids: string[]
  amount: number; method: Payment['method'] | null; status: Payment['status']
  confirmation_note: string; received_at: string; month: string
}
function mapPayment(r: PaymentRow): Payment {
  return {
    id: r.id, jobId: r.job_id, bookingRef: r.booking_ref ?? undefined,
    customerId: r.customer_id ?? undefined, cleanerIds: r.cleaner_ids,
    amount: Number(r.amount), method: r.method ?? undefined, status: r.status,
    confirmationNote: r.confirmation_note,
    receivedAt: r.received_at, month: r.month,
  }
}

// ─────────── public fetchers (cached per request) ───────────
export const getTeams = cache(async (): Promise<Team[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('archived', false)
    .order('name')
  if (error || !data) return []
  return (data as TeamRow[]).map(mapTeam)
})

export const getCleaners = cache(async (): Promise<Cleaner[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('cleaners').select('*').order('name')
  if (error || !data) return []
  return (data as CleanerRow[]).map(mapCleaner)
})

export const getCustomers = cache(async (): Promise<Customer[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as CustomerRow[]).map(mapCustomer)
})

export const getJobs = cache(async (): Promise<Job[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('jobs').select('*').order('scheduled_date').order('scheduled_time')
  if (error || !data) return []
  return (data as JobRow[]).map(mapJob)
})

export const getPayments = cache(async (): Promise<Payment[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('payments').select('*').order('received_at', { ascending: false })
  if (error || !data) return []
  return (data as PaymentRow[]).map(mapPayment)
})

// ─────────── booking requests ───────────

export type BookingRequest = {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string
  address: string
  unit: string | null
  city: string | null
  serviceType: 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb'
  preferredDate: string | null
  preferredTime: string | null
  preferredDays: string[]
  preferredArrivalTimes: string[]
  preferredExitTimes: string[]
  homeSize: string | null
  cleaningFrequency: string | null
  hasPetsAllergies: string | null
  notes: string
  status: 'pending' | 'accepted' | 'declined' | 'converted'
  source: string | null
  convertedCustomerId: string | null
  convertedJobId: string | null
  createdAt: string
  assignedTeam: number | null
  paymentMethod: string | null
  calendarEventId: string | null
}

type BookingRequestRow = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  address: string
  unit: string | null
  city: string | null
  service_type: BookingRequest['serviceType'] | null
  preferred_date: string | null
  preferred_time: string | null
  preferred_days: string[]
  preferred_arrival_times: string[]
  preferred_exit_times: string[]
  home_size: string | null
  cleaning_frequency: string | null
  has_pets_allergies: string | null
  notes: string
  status: BookingRequest['status']
  source: string | null
  converted_customer_id: string | null
  converted_job_id: string | null
  created_at: string
  assigned_team: number | null
  payment_method: string | null
  calendar_event_id: string | null
}

function mapBookingRequest(r: BookingRequestRow): BookingRequest {
  return {
    id: r.id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    address: r.address,
    unit: r.unit,
    city: r.city,
    serviceType: r.service_type ?? 'standard',
    preferredDate: r.preferred_date,
    preferredTime: r.preferred_time,
    preferredDays: r.preferred_days ?? [],
    preferredArrivalTimes: r.preferred_arrival_times ?? [],
    preferredExitTimes: r.preferred_exit_times ?? [],
    homeSize: r.home_size,
    cleaningFrequency: r.cleaning_frequency,
    hasPetsAllergies: r.has_pets_allergies,
    notes: r.notes,
    status: r.status,
    source: r.source,
    convertedCustomerId: r.converted_customer_id,
    convertedJobId: r.converted_job_id,
    createdAt: r.created_at?.slice(0, 10) ?? '',
    assignedTeam: r.assigned_team ?? null,
    paymentMethod: r.payment_method,
    calendarEventId: r.calendar_event_id,
  }
}

export const getBookingRequests = cache(async (): Promise<BookingRequest[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as unknown as BookingRequestRow[]).map(mapBookingRequest)
})

export const getAcceptedBookings = cache(async (): Promise<BookingRequest[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('status', 'accepted')
    .order('preferred_date')
    .order('assigned_team')
  if (error || !data) return []
  return (data as unknown as BookingRequestRow[]).map(mapBookingRequest)
})

// ─────────── messages ───────────

export type Message = {
  id: string
  cleanerId: string
  senderRole: 'owner' | 'cleaner'
  content: string
  readAt: string | null
  createdAt: string
}

type MessageRow = {
  id: string; cleaner_id: string; sender_role: string
  content: string; read_at: string | null; created_at: string
}

function mapMessage(r: MessageRow): Message {
  return {
    id: r.id, cleanerId: r.cleaner_id,
    senderRole: r.sender_role as 'owner' | 'cleaner',
    content: r.content, readAt: r.read_at, createdAt: r.created_at,
  }
}

export const getAllMessages = cache(async (): Promise<Message[]> => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('messages')
    .select('id, cleaner_id, sender_role, content, read_at, created_at')
    .order('created_at', { ascending: true })
    .limit(500)
  return (data ?? []).map(r => mapMessage(r as MessageRow))
})

// ─────────── derived helpers ───────────
const fmt = (d: Date) => d.toISOString().split('T')[0]
const today = () => fmt(new Date())

export async function getTodayJobs(): Promise<Job[]> {
  const all = await getJobs()
  const t = today()
  return all.filter(j => j.scheduledDate === t)
}

export async function getUpcomingJobs(): Promise<Job[]> {
  const all = await getJobs()
  const t = today()
  return all.filter(j => j.scheduledDate > t).slice(0, 8)
}

export async function getMonthRevenue(): Promise<number> {
  const all = await getPayments()
  const month = today().slice(0, 7)
  return all.filter(p => p.month === month).reduce((sum, p) => sum + p.amount, 0)
}

export async function getPendingRevenue(): Promise<number> {
  const all = await getJobs()
  return all.filter(j => !j.paid && j.status === 'completed').reduce((sum, j) => sum + j.price, 0)
}

export async function getRevenueHistory(months = 6): Promise<{ month: string; total: number }[]> {
  const all = await getPayments()
  const result: { month: string; total: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const month = d.toISOString().slice(0, 7)
    const total = all.filter(p => p.month === month).reduce((sum, p) => sum + p.amount, 0)
    result.push({ month, total })
  }
  return result
}

export const getSocialLeads = cache(async (): Promise<SocialLead[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('social_leads')
    .select('id,platform,author,author_initials,group_or_page,content,posted_at,status,location,urgency,responded_at,response_used,captured_at,likes,comments_count')
    .order('posted_at', { ascending: false })
    .limit(100)
  if (error || !data) return []
  return data.map(r => ({
    id: r.id,
    platform: r.platform as SocialLead['platform'],
    author: r.author,
    authorInitials: r.author_initials,
    groupOrPage: r.group_or_page,
    content: r.content,
    postedAt: r.posted_at,
    status: r.status as SocialLead['status'],
    location: r.location,
    urgency: r.urgency as SocialLead['urgency'],
    respondedAt: r.responded_at ?? undefined,
    responseUsed: r.response_used ?? undefined,
    capturedAt: r.captured_at ?? undefined,
    likes: r.likes,
    comments: r.comments_count,
  }))
})

export async function getTeamSchedule(
  teamId: string,
  fromDate: string,
  toDate: string,
): Promise<Job[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('team_id', teamId)
    .gte('scheduled_date', fromDate)
    .lte('scheduled_date', toDate)
    .order('scheduled_date')
    .order('scheduled_time')
  if (error || !data) return []
  return (data as JobRow[]).map(mapJob)
}
