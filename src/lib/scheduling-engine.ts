import { CLEANERS, JOBS, CUSTOMERS } from './mock-data'
import { Cleaner, SchedulingRequest, SchedulingResult, RankedTeam } from '@/types'
import { estimateDriveMinutes } from './drive-time'

const TEAMS: Record<string, [string, string]> = {
  'team-a': ['c1', 'c2'],
  'team-b': ['c3', 'c4'],
  'team-c': ['c5', 'c6'],
  'team-d': ['c7', 'c8'],
}

function getDay(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function hasTimeConflict(cleaner: Cleaner, date: string, startTime: string, duration: number): boolean {
  const newStart = parseMinutes(startTime)
  const newEnd = newStart + duration + 30 // 30 min buffer
  const jobsForCleaner = JOBS.filter(j => j.cleanerIds.includes(cleaner.id) && j.scheduledDate === date && j.status !== 'cancelled')
  return jobsForCleaner.some(j => {
    const jStart = parseMinutes(j.scheduledTime)
    const jEnd = jStart + j.estimatedDuration + 30
    return !(newEnd <= jStart || newStart >= jEnd)
  })
}

function scoreTeam(
  teamId: string,
  request: SchedulingRequest
): RankedTeam {
  const cleanerIds = TEAMS[teamId] as [string, string]
  const cleaners = cleanerIds.map(id => CLEANERS.find(c => c.id === id)!).filter(Boolean)

  if (cleaners.length < 2) {
    return { cleanerIds, score: 0, driveTimeMinutes: 999, availabilityConfidence: 0, matchReasons: [], warnings: ['Team not fully available'], estimatedArrivalBuffer: 0 }
  }

  const customer = CUSTOMERS.find(c => c.id === request.customerId)
  const day = getDay(request.jobDate)
  const matchReasons: string[] = []
  const warnings: string[] = []

  // Per-cleaner scoring
  const cleanerScores = cleaners.map(cleaner => {
    // Factor 1: Proximity (30%)
    const driveMin = estimateDriveMinutes(cleaner.currentLat, cleaner.currentLng, request.jobLat, request.jobLng)
    const proximityScore = Math.max(0, 100 - driveMin * 2)

    // Factor 2: Availability (25%)
    const hours = cleaner.availableHours[day]
    let availabilityScore = 0
    if (!hours) {
      warnings.push(`${cleaner.name.split(' ')[0]} is off today`)
      availabilityScore = 0
    } else {
      const conflict = hasTimeConflict(cleaner, request.jobDate, request.jobTime, request.jobDuration)
      if (conflict) {
        warnings.push(`${cleaner.name.split(' ')[0]} has a scheduling conflict`)
        availabilityScore = 10
      } else {
        // Check buffer
        const requestStart = parseMinutes(request.jobTime)
        const available = parseMinutes(hours.start)
        const buffer = requestStart - available
        availabilityScore = buffer >= 30 ? 100 : 60
      }
    }

    // Factor 3: Reliability (20%)
    const reliabilityScore = cleaner.reliabilityScore

    // Factor 4: Customer preference (15%)
    let preferenceScore = 50
    if (customer?.preferredCleanerIds.includes(cleaner.id)) {
      preferenceScore = 100
      if (!matchReasons.includes('Customer preferred team')) matchReasons.push('Customer preferred team')
    }

    // Factor 5: Specialty (10%)
    const specialtyScore = cleaner.specialties.includes(request.serviceType as any) ? 100 : 40

    return 0.30 * proximityScore + 0.25 * availabilityScore + 0.20 * reliabilityScore + 0.15 * preferenceScore + 0.10 * specialtyScore
  })

  const avgScore = cleanerScores.reduce((a, b) => a + b, 0) / cleanerScores.length
  const avgDrive = cleaners.reduce((sum, c) => sum + estimateDriveMinutes(c.currentLat, c.currentLng, request.jobLat, request.jobLng), 0) / cleaners.length

  // Build match reasons
  if (avgDrive <= 15) matchReasons.push(`Only ${Math.round(avgDrive)} min away`)
  else if (avgDrive <= 30) matchReasons.push(`${Math.round(avgDrive)} min drive`)

  const avgRating = cleaners.reduce((s, c) => s + c.rating, 0) / cleaners.length
  if (avgRating >= 4.8) matchReasons.push(`${avgRating.toFixed(1)}★ average rating`)

  const avgReliability = cleaners.reduce((s, c) => s + c.reliabilityScore, 0) / cleaners.length
  if (avgReliability >= 90) matchReasons.push(`${Math.round(avgReliability)}% reliability score`)

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

export function computeSchedulingRecommendations(request: SchedulingRequest): SchedulingResult {
  const rankedTeams = Object.keys(TEAMS)
    .map(teamId => scoreTeam(teamId, request))
    .sort((a, b) => b.score - a.score)

  const best = rankedTeams[0]
  const bestCleaners = best.cleanerIds.map(id => CLEANERS.find(c => c.id === id)!)
  const names = bestCleaners.map(c => c.name).join(' + ')

  const reasoning = `${names} is the best match: ${best.driveTimeMinutes}-minute drive, ${best.matchReasons[0] || 'fully available'}. Confidence: ${best.score}%.`

  return {
    rankedTeams,
    reasoning,
    confidenceScore: best.score,
  }
}
