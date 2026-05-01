import { computeInsertionCost } from './route-optimizer'
import { NurturingCampaign, BookingSlot, BookingLink, CampaignStatus, Job, Customer, Cleaner } from '@/types'
import { differenceInDays, addDays, format, parseISO } from 'date-fns'

function getToday(): Date { return new Date() }

function fmtDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function getDayName(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function customerLastJob(customerId: string, jobs: Job[]) {
  return jobs
    .filter(j => j.customerId === customerId && j.status === 'completed')
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0] ?? null
}

function buildMessage(customerName: string, daysSince: number, serviceType: string): string {
  const first = customerName.split(' ')[0]
  if (daysSince >= 30) {
    return `Hi ${first}! 👋 It's been a little while since your last ${serviceType === 'deep' ? 'deep clean' : 'cleaning'} — we'd love to help you refresh your home! We're running a special for returning clients. Want to grab a spot on our schedule? Just tap the link below to pick a time that works for you. 🧹✨`
  }
  return `Hi ${first}! ✨ Your home is probably due for another cleaning — it's been about ${Math.round(daysSince / 7)} weeks since your last one. Our team is in your area and we have availability coming up. Tap the link to book your next cleaning — takes less than a minute! 🏠`
}

// ─── Nurturing detection ──────────────────────────────────────────────────────

export function detectNurturingCandidates(
  customers: Customer[] = [],
  jobs: Job[] = [],
): NurturingCampaign[] {
  const campaigns: NurturingCampaign[] = []

  for (const customer of customers) {
    const lastJob = customerLastJob(customer.id, jobs)
    if (!lastJob) continue

    const daysSince = differenceInDays(getToday(), parseISO(lastJob.scheduledDate))
    if (daysSince < 18) continue

    const status: CampaignStatus = daysSince > 42 ? 'expired' : 'pending'
    const token = generateBookingToken(customer.id)

    campaigns.push({
      id: `camp-${customer.id}-${lastJob.id}`,
      customerId: customer.id,
      trigger: daysSince >= 30 ? 'inactive-30d' : 'three-week-followup',
      scheduledDate: fmtDate(addDays(parseISO(lastJob.scheduledDate), 21)),
      status,
      message: buildMessage(customer.name, daysSince, lastJob.serviceType),
      bookingLinkToken: token,
      lastJobDate: lastJob.scheduledDate,
      lastJobId: lastJob.id,
      daysSinceLastJob: daysSince,
    })
  }

  return campaigns.sort((a, b) => a.daysSinceLastJob - b.daysSinceLastJob)
}

// ─── Teams map ────────────────────────────────────────────────────────────────

const SLOT_TIMES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00']
const DEFAULT_DURATION = 150

// ─── Conflict check ───────────────────────────────────────────────────────────

function hasConflict(cleanerId: string, date: string, time: string, allJobs: Job[]): boolean {
  const startMin = parseMinutes(time)
  const endMin   = startMin + DEFAULT_DURATION + 30
  return allJobs.some(j => {
    if (!j.cleanerIds.includes(cleanerId) || j.scheduledDate !== date || j.status === 'cancelled') return false
    const jStart = parseMinutes(j.scheduledTime)
    const jEnd   = jStart + (j.estimatedDuration ?? DEFAULT_DURATION) + 30
    return !(endMin <= jStart || startMin >= jEnd)
  })
}

// ─── Available slot generation ──────────────────────────────────��─────────────

/**
 * @param customerId   Customer requesting the booking
 * @param extraJobs    Additional confirmed bookings to account for (from booking store)
 * @param customers    Customer list (defaults to empty)
 * @param cleaners     Cleaner list (defaults to empty)
 * @param jobs         Job list (defaults to empty)
 */
export function getAvailableSlots(
  customerId: string,
  extraJobs: Job[] = [],
  customers: Customer[] = [],
  cleaners: Cleaner[] = [],
  jobs: Job[] = [],
): BookingSlot[] {
  const customer = customers.find(c => c.id === customerId)
  if (!customer) return []

  const allJobs: Job[] = [...jobs, ...extraJobs as Job[]]
  const slots: BookingSlot[] = []

  // Derive team map from actual cleaner data so real DB cleaners work alongside mock fallback
  const teamMap = new Map<string, Cleaner[]>()
  for (const c of cleaners) {
    if (c.teamId) {
      const existing = teamMap.get(c.teamId) ?? []
      existing.push(c)
      teamMap.set(c.teamId, existing)
    }
  }

  for (let dayOffset = 1; dayOffset <= 8; dayOffset++) {
    const date    = fmtDate(addDays(getToday(), dayOffset))
    const dayName = getDayName(addDays(getToday(), dayOffset))

    for (const [teamId, teamCleaners] of teamMap.entries()) {
      const cleanerIds = teamCleaners.map(c => c.id)
      if (teamCleaners.length < 1) continue

      for (const time of SLOT_TIMES) {
        // Check both cleaners are available that day and time
        const allAvailable = teamCleaners.every(c => {
          const hours = c.availableHours[dayName as keyof typeof c.availableHours]
          if (!hours) return false
          const slotStart  = parseMinutes(time)
          const cleanStart = parseMinutes(hours.start)
          const cleanEnd   = parseMinutes(hours.end)
          return slotStart >= cleanStart && (slotStart + DEFAULT_DURATION) <= cleanEnd
        })
        if (!allAvailable) continue

        // No scheduling conflicts (including confirmed bookings)
        const noConflict = teamCleaners.every(c => !hasConflict(c.id, date, time, allJobs))
        if (!noConflict) continue

        // Filter teams that are too far from the customer
        const avgDriveMins = teamCleaners.reduce((sum, c) => {
          const dx = (c.homeAreaLat - customer.lat) * 111
          const dy = (c.homeAreaLng - customer.lng) * 85
          return sum + Math.round(Math.sqrt(dx * dx + dy * dy) * 2)
        }, 0) / teamCleaners.length
        if (avgDriveMins > 55) continue

        // Compute real cheapest-insertion score using existing team route
        const teamDayJobs = allJobs.filter(j =>
          j.scheduledDate === date &&
          j.status !== 'cancelled' &&
          j.cleanerIds.some(id => cleanerIds.includes(id))
        )

        const lead = teamCleaners[0]
        const result = computeInsertionCost(
          teamDayJobs,
          time,
          customer.lat,
          customer.lng,
          lead.homeAreaLat,
          lead.homeAreaLng
        )

        const dateObj    = addDays(getToday(), dayOffset)
        const dateLabel  = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        const [h, m]     = time.split(':').map(Number)
        const ampm       = h >= 12 ? 'PM' : 'AM'
        const timeLabel  = `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`

        slots.push({
          date,
          time,
          cleanerIds: cleanerIds as string[],
          driveTimeMinutes: Math.round(avgDriveMins),
          routeScore: result.score,
          insertionKm: result.insertionKm,
          insertionLabel: result.label,
          position: result.position,
          label: `${dateLabel} at ${timeLabel}`,
        })
      }
    }
  }

  // Deduplicate: same date+time, keep lowest insertion cost (most efficient)
  const deduped = new Map<string, BookingSlot>()
  for (const slot of slots) {
    const key = `${slot.date}-${slot.time}`
    const existing = deduped.get(key)
    if (!existing || slot.routeScore < existing.routeScore) deduped.set(key, slot)
  }

  return Array.from(deduped.values())
    .sort((a, b) => {
      // Primary: date; secondary: route efficiency (best first within a day)
      const dateComp = a.date.localeCompare(b.date)
      if (dateComp !== 0) return dateComp
      return a.routeScore - b.routeScore
    })
    .slice(0, 14)
}

// ─── Booking link helpers ─────────────────────────────────────────────────────

export function generateBookingToken(customerId: string): string {
  const payload = { customerId, created: fmtDate(getToday()), expires: fmtDate(addDays(getToday(), 7)) }
  return btoa(JSON.stringify(payload)).replace(/=/g, '')
}

export function decodeBookingToken(token: string): { customerId: string; created: string; expires: string } | null {
  try {
    const padded = token + '=='.slice(0, (4 - (token.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export function generateBookingLink(customerId: string): BookingLink {
  const token = generateBookingToken(customerId)
  const slots  = getAvailableSlots(customerId)
  return {
    token,
    customerId,
    createdAt: fmtDate(getToday()),
    expiresAt: fmtDate(addDays(getToday(), 7)),
    status: 'active',
    slots,
  }
}
