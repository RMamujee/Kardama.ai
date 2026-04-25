/**
 * Cheapest-insertion route optimizer.
 * For a proposed (team, date, time) slot, computes how much extra driving the team
 * would incur by adding the new job — factoring in traffic via routing-engine.ts.
 *
 * lower insertionKm = more route-efficient (team is "already going that way")
 */
import { Job } from '@/types'
import { trafficDrive } from './routing-engine'

export interface InsertionResult {
  insertionKm: number    // extra km vs not taking this job
  insertionMin: number   // extra drive minutes
  score: number          // 0-100, higher = more efficient
  label: string          // human-readable
  position: 'start-of-day' | 'between-jobs' | 'end-of-day'
  beforeJobAddr?: string // address of job immediately before
  afterJobAddr?: string  // address of job immediately after
}

function parseMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/**
 * Compute cheapest-insertion cost for a new job at slotTime into a team's existing route.
 *
 * @param teamJobs  Existing jobs for this team on this date (any order — sorted internally)
 * @param slotTime  Proposed start time for the new job, e.g. "10:00"
 * @param newLat    New job latitude
 * @param newLng    New job longitude
 * @param homeLat   Team's home-area / start-of-day latitude
 * @param homeLng   Team's home-area / start-of-day longitude
 */
export function computeInsertionCost(
  teamJobs: Job[],
  slotTime: string,
  newLat: number,
  newLng: number,
  homeLat: number,
  homeLng: number
): InsertionResult {
  const sorted = [...teamJobs].sort((a, b) => parseMin(a.scheduledTime) - parseMin(b.scheduledTime))
  const slotMin = parseMin(slotTime)

  // Find where slotTime fits chronologically
  const insertIdx = sorted.findIndex(j => parseMin(j.scheduledTime) > slotMin)
  const pos = insertIdx === -1 ? sorted.length : insertIdx

  const prev = pos > 0 ? sorted[pos - 1] : null
  const next = pos < sorted.length ? sorted[pos] : null

  let insertionKm: number
  let insertionMin: number
  let position: InsertionResult['position']

  if (!prev && !next) {
    // Empty day: cost is just driving from home to the new job
    const d = trafficDrive(homeLat, homeLng, newLat, newLng)
    insertionKm = d.km
    insertionMin = d.minutes
    position = 'start-of-day'
  } else if (!prev) {
    // Insert before the first job: home → new → first
    const homeToNew  = trafficDrive(homeLat, homeLng, newLat, newLng)
    const newToNext  = trafficDrive(newLat, newLng, next!.lat, next!.lng)
    const homeToNext = trafficDrive(homeLat, homeLng, next!.lat, next!.lng)
    insertionKm  = Math.max(0, homeToNew.km  + newToNext.km  - homeToNext.km)
    insertionMin = Math.max(0, homeToNew.minutes + newToNext.minutes - homeToNext.minutes)
    position = 'start-of-day'
  } else if (!next) {
    // Append after last job: last → new (no displacement cost)
    const d = trafficDrive(prev.lat, prev.lng, newLat, newLng)
    insertionKm  = d.km
    insertionMin = d.minutes
    position = 'end-of-day'
  } else {
    // Slide between prev and next
    const prevToNew  = trafficDrive(prev.lat, prev.lng, newLat, newLng)
    const newToNext  = trafficDrive(newLat, newLng, next.lat, next.lng)
    const prevToNext = trafficDrive(prev.lat, prev.lng, next.lat, next.lng)
    insertionKm  = Math.max(0, prevToNew.km  + newToNext.km  - prevToNext.km)
    insertionMin = Math.max(0, prevToNew.minutes + newToNext.minutes - prevToNext.minutes)
    position = 'between-jobs'
  }

  insertionKm  = Math.round(insertionKm * 10) / 10
  insertionMin = Math.round(insertionMin)

  // Score: 100 = zero extra km; 0 = 20 km detour
  const score = Math.max(0, Math.round(100 - (insertionKm / 20) * 100))

  const label = insertionKm < 1.5
    ? `On route (+${insertionKm.toFixed(1)} km)`
    : insertionKm < 4
    ? `Nearby (+${insertionKm.toFixed(1)} km)`
    : insertionKm < 10
    ? `Slight detour (+${insertionKm.toFixed(1)} km)`
    : `Detour (+${Math.round(insertionKm)} km)`

  return {
    insertionKm,
    insertionMin,
    score,
    label,
    position,
    beforeJobAddr: prev ? prev.address.split(',')[0] : undefined,
    afterJobAddr:  next ? next.address.split(',')[0] : undefined,
  }
}
