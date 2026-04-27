import 'server-only'
import { cache } from 'react'
import type { Cleaner, Customer, Job, Payment } from '@/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import * as mock from '@/lib/mock-data'

// ─────────────────────────────────────────────────────────────────
// Server-side data layer.
// Returns data in the existing camelCase Type shape so the UI is unchanged.
// Falls back to mock data when Supabase env vars aren't configured yet —
// keeps the app bootable before the user finishes the Marketplace setup.
// ─────────────────────────────────────────────────────────────────

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

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
  }
}

type PaymentRow = {
  id: string; job_id: string; customer_id: string; cleaner_ids: string[]
  amount: number; method: Payment['method']; status: Payment['status']
  confirmation_note: string; received_at: string; month: string
}
function mapPayment(r: PaymentRow): Payment {
  return {
    id: r.id, jobId: r.job_id, customerId: r.customer_id, cleanerIds: r.cleaner_ids,
    amount: Number(r.amount), method: r.method, status: r.status,
    confirmationNote: r.confirmation_note,
    receivedAt: r.received_at, month: r.month,
  }
}

// ─────────── public fetchers (cached per request) ───────────
export const getCleaners = cache(async (): Promise<Cleaner[]> => {
  if (!isSupabaseConfigured()) return mock.CLEANERS
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('cleaners').select('*').order('name')
  if (error || !data) return mock.CLEANERS
  return (data as CleanerRow[]).map(mapCleaner)
})

export const getCustomers = cache(async (): Promise<Customer[]> => {
  if (!isSupabaseConfigured()) return mock.CUSTOMERS
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
  if (error || !data) return mock.CUSTOMERS
  return (data as CustomerRow[]).map(mapCustomer)
})

export const getJobs = cache(async (): Promise<Job[]> => {
  if (!isSupabaseConfigured()) return mock.JOBS
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('jobs').select('*').order('scheduled_date').order('scheduled_time')
  if (error || !data) return mock.JOBS
  return (data as JobRow[]).map(mapJob)
})

export const getPayments = cache(async (): Promise<Payment[]> => {
  if (!isSupabaseConfigured()) return mock.PAYMENTS
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('payments').select('*').order('received_at', { ascending: false })
  if (error || !data) return mock.PAYMENTS
  return (data as PaymentRow[]).map(mapPayment)
})

// ─────────── derived helpers (mirror mock-data.ts API) ───────────
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
