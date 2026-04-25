import { CUSTOMERS, JOBS, CLEANERS } from './mock-data'
import { estimateDriveMinutes } from './drive-time'
import { NurturingCampaign, BookingSlot, BookingLink, CampaignStatus } from '@/types'
import { differenceInDays, addDays, format, parseISO } from 'date-fns'

const TODAY = new Date()

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

function customerLastJob(customerId: string) {
  const completed = JOBS
    .filter(j => j.customerId === customerId && j.status === 'completed')
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
  return completed[0] || null
}

function buildMessage(customerName: string, daysSince: number, serviceType: string): string {
  const first = customerName.split(' ')[0]
  if (daysSince >= 30) {
    return `Hi ${first}! 👋 It's been a little while since your last ${serviceType === 'deep' ? 'deep clean' : 'cleaning'} — we'd love to help you refresh your home! We're running a special for returning clients. Want to grab a spot on our schedule? Just tap the link below to pick a time that works for you. 🧹✨`
  }
  return `Hi ${first}! ✨ Your home is probably due for another cleaning — it's been about ${Math.round(daysSince / 7)} weeks since your last one. Our team is in your area and we have availability coming up. Tap the link to book your next cleaning — takes less than a minute! 🏠`
}

export function detectNurturingCandidates(): NurturingCampaign[] {
  const campaigns: NurturingCampaign[] = []

  for (const customer of CUSTOMERS) {
    const lastJob = customerLastJob(customer.id)
    if (!lastJob) continue

    const daysSince = differenceInDays(TODAY, parseISO(lastJob.scheduledDate))

    // 3-week window: 21–42 days out (ideally send right around 21 days)
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

// --- Booking Slot Generation ---

const TEAMS: Record<string, [string, string]> = {
  'team-a': ['c1', 'c2'],
  'team-b': ['c3', 'c4'],
  'team-c': ['c5', 'c6'],
  'team-d': ['c7', 'c8'],
}

const SLOT_TIMES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00']
const JOB_DURATION = 150 // default 2.5 hours for route scoring

function hasConflict(cleanerId: string, date: string, time: string): boolean {
  const startMin = parseMinutes(time)
  const endMin = startMin + JOB_DURATION + 30
  return JOBS.some(j => {
    if (!j.cleanerIds.includes(cleanerId) || j.scheduledDate !== date || j.status === 'cancelled') return false
    const jStart = parseMinutes(j.scheduledTime)
    const jEnd = jStart + j.estimatedDuration + 30
    return !(endMin <= jStart || startMin >= jEnd)
  })
}

function routeScore(cleanerIds: string[], date: string, custLat: number, custLng: number): number {
  // Score how efficient adding this job is — higher means route-efficient
  const dayJobs = JOBS.filter(j =>
    j.scheduledDate === date &&
    j.status !== 'cancelled' &&
    j.cleanerIds.some(id => cleanerIds.includes(id))
  )

  if (dayJobs.length === 0) {
    // Fresh day — score based on proximity to cleaner home area
    const cleaners = cleanerIds.map(id => CLEANERS.find(c => c.id === id)!).filter(Boolean)
    const avgDrive = cleaners.reduce((sum, c) => sum + estimateDriveMinutes(c.homeAreaLat, c.homeAreaLng, custLat, custLng), 0) / cleaners.length
    return Math.max(0, 100 - avgDrive * 1.5)
  }

  // Score based on proximity to existing day jobs (cluster bonus)
  const nearbyCount = dayJobs.filter(j => {
    const km = Math.sqrt(Math.pow((j.lat - custLat) * 111, 2) + Math.pow((j.lng - custLng) * 85, 2))
    return km < 8 // within 8km
  }).length

  return Math.min(100, 50 + nearbyCount * 20)
}

export function getAvailableSlots(customerId: string): BookingSlot[] {
  const customer = CUSTOMERS.find(c => c.id === customerId)
  if (!customer) return []

  const slots: BookingSlot[] = []

  for (let dayOffset = 1; dayOffset <= 8; dayOffset++) {
    const date = fmtDate(addDays(TODAY, dayOffset))
    const dayName = getDayName(addDays(TODAY, dayOffset))

    for (const [, cleanerIds] of Object.entries(TEAMS)) {
      const cleaners = cleanerIds.map(id => CLEANERS.find(c => c.id === id)!).filter(Boolean)
      if (cleaners.length < 2) continue

      for (const time of SLOT_TIMES) {
        // Check both cleaners are available that day and time
        const allAvailable = cleaners.every(c => {
          const hours = c.availableHours[dayName as keyof typeof c.availableHours]
          if (!hours) return false
          const slotStart = parseMinutes(time)
          const cleanerStart = parseMinutes(hours.start)
          const cleanerEnd = parseMinutes(hours.end)
          return slotStart >= cleanerStart && (slotStart + JOB_DURATION) <= cleanerEnd
        })

        if (!allAvailable) continue

        // Check no scheduling conflicts
        const noConflict = cleaners.every(c => !hasConflict(c.id, date, time))
        if (!noConflict) continue

        // Prefer teams near the customer or already routing that area
        const avgDrive = cleaners.reduce((sum, c) =>
          sum + estimateDriveMinutes(c.currentLat, c.currentLng, customer.lat, customer.lng), 0
        ) / cleaners.length

        // Limit to reasonable drive time
        if (avgDrive > 45) continue

        const score = routeScore(cleanerIds as string[], date, customer.lat, customer.lng)
        const dateObj = addDays(TODAY, dayOffset)
        const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        const [h, m] = time.split(':').map(Number)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        const timeLabel = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`

        slots.push({
          date,
          time,
          cleanerIds: cleanerIds as string[],
          driveTimeMinutes: Math.round(avgDrive),
          routeScore: score,
          label: `${dateLabel} at ${timeLabel}`,
        })
      }
    }
  }

  // Deduplicate (same date+time, keep best route score)
  const deduped = new Map<string, BookingSlot>()
  for (const slot of slots) {
    const key = `${slot.date}-${slot.time}`
    const existing = deduped.get(key)
    if (!existing || slot.routeScore > existing.routeScore) deduped.set(key, slot)
  }

  return Array.from(deduped.values())
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return b.routeScore - a.routeScore
    })
    .slice(0, 12) // top 12 slots
}

export function generateBookingToken(customerId: string): string {
  const payload = { customerId, created: fmtDate(TODAY), expires: fmtDate(addDays(TODAY, 7)) }
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
  const slots = getAvailableSlots(customerId)

  return {
    token,
    customerId,
    createdAt: fmtDate(TODAY),
    expiresAt: fmtDate(addDays(TODAY, 7)),
    status: 'active',
    slots,
  }
}
