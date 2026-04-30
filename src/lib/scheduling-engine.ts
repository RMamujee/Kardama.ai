import { Cleaner, Customer, Job, SchedulingRequest, SchedulingResult, RankedTeam } from '@/types'
import { estimateDriveMinutes } from './drive-time'

function getDay(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function hasTimeConflict(
  cleaner: Cleaner,
  date: string,
  startTime: string,
  duration: number,
  jobs: Job[],
): boolean {
  const newStart = parseMinutes(startTime)
  const newEnd = newStart + duration + 30
  return jobs
    .filter(j => j.cleanerIds.includes(cleaner.id) && j.scheduledDate === date && j.status !== 'cancelled')
    .some(j => {
      const jStart = parseMinutes(j.scheduledTime)
      const jEnd = jStart + j.estimatedDuration + 30
      return !(newEnd <= jStart || newStart >= jEnd)
    })
}

// Returns true only if the cleaner has explicitly set their hours for this day
// (even null = "day off" counts as "known"). Undefined/missing = not set in mobile.
function scheduleKnown(cleaner: Cleaner, day: string): boolean {
  const h = cleaner.availableHours
  return !!h && Object.keys(h).length > 0 && day in h
}

function scoreTeam(
  teamCleaners: Cleaner[],
  request: SchedulingRequest,
  jobs: Job[],
  customer: Customer | undefined,
): RankedTeam | null {
  const cleanerIds = teamCleaners.map(c => c.id) as [string, string]

  if (teamCleaners.length < 2) return null

  const day = getDay(request.jobDate)

  // Hard block: any cleaner hasn't set their schedule in the mobile app
  for (const c of teamCleaners) {
    if (!scheduleKnown(c, day)) return null
  }

  const matchReasons: string[] = []
  const warnings: string[] = []

  const cleanerScores = teamCleaners.map(cleaner => {
    const driveMin = estimateDriveMinutes(cleaner.currentLat, cleaner.currentLng, request.jobLat, request.jobLng)
    const proximityScore = Math.max(0, 100 - driveMin * 2)

    const hours = cleaner.availableHours[day]
    let availabilityScore = 0
    if (!hours) {
      // null = explicitly off this day (schedule is known, cleaner is unavailable)
      warnings.push(`${cleaner.name.split(' ')[0]} is off today`)
    } else if (hasTimeConflict(cleaner, request.jobDate, request.jobTime, request.jobDuration, jobs)) {
      warnings.push(`${cleaner.name.split(' ')[0]} has a conflict`)
      availabilityScore = 10
    } else {
      const buffer = parseMinutes(request.jobTime) - parseMinutes(hours.start)
      availabilityScore = buffer >= 30 ? 100 : 60
    }

    let preferenceScore = 50
    if (customer?.preferredCleanerIds.includes(cleaner.id)) {
      preferenceScore = 100
      if (!matchReasons.includes('Customer preferred team')) matchReasons.push('Customer preferred team')
    }

    const specialtyScore = cleaner.specialties.includes(request.serviceType as never) ? 100 : 40

    return (
      0.30 * proximityScore +
      0.25 * availabilityScore +
      0.20 * cleaner.reliabilityScore +
      0.15 * preferenceScore +
      0.10 * specialtyScore
    )
  })

  const avgScore = cleanerScores.reduce((a, b) => a + b, 0) / cleanerScores.length
  const avgDrive =
    teamCleaners.reduce((sum, c) => sum + estimateDriveMinutes(c.currentLat, c.currentLng, request.jobLat, request.jobLng), 0) /
    teamCleaners.length

  if (avgDrive <= 15) matchReasons.push(`Only ${Math.round(avgDrive)} min away`)
  else if (avgDrive <= 30) matchReasons.push(`${Math.round(avgDrive)} min drive`)

  const avgRating = teamCleaners.reduce((s, c) => s + c.rating, 0) / teamCleaners.length
  if (avgRating >= 4.8) matchReasons.push(`${avgRating.toFixed(1)}★ avg rating`)

  const avgReliability = teamCleaners.reduce((s, c) => s + c.reliabilityScore, 0) / teamCleaners.length
  if (avgReliability >= 90) matchReasons.push(`${Math.round(avgReliability)}% reliability`)

  return {
    cleanerIds,
    score: Math.round(avgScore),
    driveTimeMinutes: Math.round(avgDrive),
    availabilityConfidence: warnings.length === 0 ? 95 : 40,
    matchReasons,
    warnings,
    estimatedArrivalBuffer: 15,
  }
}

export function computeSchedulingRecommendations(
  request: SchedulingRequest,
  cleaners: Cleaner[] = [],
  jobs: Job[] = [],
  customers: Customer[] = [],
): SchedulingResult {
  const teamMap = new Map<string, Cleaner[]>()
  for (const c of cleaners) {
    if (c.teamId) {
      const list = teamMap.get(c.teamId) ?? []
      list.push(c)
      teamMap.set(c.teamId, list)
    }
  }

  const customer = customers.find(c => c.id === request.customerId)
  const rankedTeams = Array.from(teamMap.values())
    .map(teamCleaners => scoreTeam(teamCleaners, request, jobs, customer))
    .filter((t): t is RankedTeam => t !== null)
    .sort((a, b) => b.score - a.score)

  if (rankedTeams.length === 0) {
    return { rankedTeams: [], reasoning: 'No teams with confirmed schedules are available for this date.', confidenceScore: 0 }
  }

  const best = rankedTeams[0]
  const bestCleaners = best.cleanerIds.map(id => cleaners.find(c => c.id === id)).filter(Boolean) as Cleaner[]
  const names = bestCleaners.map(c => c.name).join(' + ')
  const reasoning = `${names} is the best match: ${best.driveTimeMinutes}-minute drive, ${best.matchReasons[0] || 'fully available'}. Confidence: ${best.score}%.`

  return { rankedTeams, reasoning, confidenceScore: best.score }
}
