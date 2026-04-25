import { Job, Cleaner } from '@/types'

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function parseMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(m: number): string {
  const total = ((m % 1440) + 1440) % 1440
  const h = Math.floor(total / 60), min = total % 60
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${min.toString().padStart(2, '0')} ${period}`
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Traffic modelling ────────────────────────────────────────────────────────
export type TrafficLevel = 'clear' | 'moderate' | 'heavy'

export function getTrafficLevel(fromLat: number, fromLng: number, toLat: number, toLng: number): TrafficLevel {
  const midLng = (fromLng + toLng) / 2
  const midLat = (fromLat + toLat) / 2
  if (midLng > -118.42 && midLng < -118.33 && midLat > 33.83 && midLat < 33.94) return 'heavy'     // I-405 corridor
  if ((midLng > -118.20 && midLng < -118.16) || (midLat > 33.855 && midLat < 33.880)) return 'moderate' // I-710 / SR-91
  return 'clear'
}

const TRAFFIC_MULT: Record<TrafficLevel, number> = { heavy: 1.65, moderate: 1.35, clear: 1.0 }

export function trafficDrive(fromLat: number, fromLng: number, toLat: number, toLng: number): {
  minutes: number; km: number; traffic: TrafficLevel
} {
  const km = haversineKm(fromLat, fromLng, toLat, toLng)
  const traffic = getTrafficLevel(fromLat, fromLng, toLat, toLng)
  const minutes = Math.round((km / 30) * 60 * TRAFFIC_MULT[traffic] + 4)
  return { minutes, km, traffic }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RouteStop {
  job: Job
  sequence: number
  drive: { minutes: number; km: number; traffic: TrafficLevel }
  arrivalMin: number   // when team arrives
  startMin: number     // when job actually starts (max of arrival + scheduled)
  endMin: number
  arrivalTime: string
  startTime: string
  waitMin: number      // buffer before job
  status: 'pending' | 'active' | 'complete' | 'cancelled'
}

export interface TeamRoute {
  teamId: string
  cleanerIds: string[]
  cleanerNames: string[]
  color: string
  startLat: number
  startLng: number
  stops: RouteStop[]
  totalDriveMin: number
  totalJobMin: number
  totalKm: number
  efficiency: number          // 0-100 — job time / total working time
  polyline: [number, number][]
}

export interface RescheduleSlot {
  afterStopIdx: number   // -1 = before first stop
  gapMin: number
  windowStart: string
  windowEnd: string
}

// ─── Nearest-neighbour TSP with time windows ──────────────────────────────────
function nnOptimize(jobs: Job[], startLat: number, startLng: number): Job[] {
  const remaining = [...jobs]
  const ordered: Job[] = []
  let lat = startLat, lng = startLng, curMin = 8 * 60

  while (remaining.length > 0) {
    let bestIdx = 0, bestScore = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const j = remaining[i]
      const { minutes } = trafficDrive(lat, lng, j.lat, j.lng)
      const arrival = curMin + minutes
      const scheduled = parseMin(j.scheduledTime)

      // Heavily penalise arriving late; small penalty for large idle waits
      const latePenalty   = Math.max(0, arrival - scheduled - 10) * 4
      const idlePenalty   = Math.max(0, scheduled - arrival - 45) * 0.4
      const score = minutes + latePenalty + idlePenalty
      if (score < bestScore) { bestScore = score; bestIdx = i }
    }

    const next = remaining.splice(bestIdx, 1)[0]
    ordered.push(next)
    const { minutes } = trafficDrive(lat, lng, next.lat, next.lng)
    curMin = Math.max(curMin + minutes, parseMin(next.scheduledTime)) + next.estimatedDuration
    lat = next.lat; lng = next.lng
  }

  return ordered
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function buildOptimizedRoutes(jobs: Job[], cleaners: Cleaner[]): TeamRoute[] {
  // Group cleaners into teams
  const teamCleaner = new Map<string, Cleaner[]>()
  for (const c of cleaners) {
    if (!teamCleaner.has(c.teamId)) teamCleaner.set(c.teamId, [])
    teamCleaner.get(c.teamId)!.push(c)
  }

  // Assign jobs to teams (by first cleaner's teamId)
  const teamJobs = new Map<string, Job[]>()
  for (const job of jobs) {
    if (job.status === 'cancelled') continue
    const c = cleaners.find(x => x.id === job.cleanerIds[0])
    if (!c) continue
    if (!teamJobs.has(c.teamId)) teamJobs.set(c.teamId, [])
    teamJobs.get(c.teamId)!.push(job)
  }

  const routes: TeamRoute[] = []

  for (const [teamId, members] of teamCleaner) {
    const jobs = teamJobs.get(teamId) ?? []
    if (jobs.length === 0) continue

    const startLat = members[0].currentLat
    const startLng = members[0].currentLng
    const color = members[0].color

    const ordered = nnOptimize(jobs, startLat, startLng)

    // Build stops
    const stops: RouteStop[] = []
    let lat = startLat, lng = startLng, curMin = 8 * 60

    for (let i = 0; i < ordered.length; i++) {
      const job = ordered[i]
      const drive = trafficDrive(lat, lng, job.lat, job.lng)
      const arrivalMin = curMin + drive.minutes
      const startMin   = Math.max(arrivalMin, parseMin(job.scheduledTime))
      const endMin     = startMin + job.estimatedDuration
      const waitMin    = Math.max(0, startMin - arrivalMin)

      stops.push({
        job, sequence: i + 1, drive,
        arrivalMin, startMin, endMin,
        arrivalTime: minToTime(arrivalMin),
        startTime: minToTime(startMin),
        waitMin,
        status: job.status === 'completed' ? 'complete'
              : job.status === 'in-progress' ? 'active'
              : 'pending',
      })

      curMin = endMin
      lat = job.lat; lng = job.lng
    }

    const polyline: [number, number][] = [[startLat, startLng], ...stops.map(s => [s.job.lat, s.job.lng] as [number, number])]
    const totalDriveMin = stops.reduce((s, x) => s + x.drive.minutes, 0)
    const totalJobMin   = stops.reduce((s, x) => s + x.job.estimatedDuration, 0)
    const totalKm       = stops.reduce((s, x) => s + x.drive.km, 0)
    const totalTime     = stops.length ? stops[stops.length - 1].endMin - 8 * 60 : 1
    const efficiency    = Math.min(Math.round((totalJobMin / Math.max(totalTime, 1)) * 100), 99)

    routes.push({
      teamId, cleanerIds: members.map(c => c.id),
      cleanerNames: members.map(c => c.name.split(' ')[0]),
      color, startLat, startLng, stops,
      totalDriveMin, totalJobMin,
      totalKm: Math.round(totalKm * 10) / 10,
      efficiency, polyline,
    })
  }

  return routes
}

// ─── Find gaps in route where a cancellation opened time ─────────────────────
export function findRescheduleSlots(stops: RouteStop[]): RescheduleSlot[] {
  const MIN_GAP = 90
  const slots: RescheduleSlot[] = []
  const active = stops.filter(s => s.status !== 'cancelled')

  for (let i = 0; i < active.length - 1; i++) {
    const gap = active[i + 1].startMin - active[i].endMin
    if (gap >= MIN_GAP) {
      slots.push({
        afterStopIdx: active[i].sequence - 1,
        gapMin: gap,
        windowStart: minToTime(active[i].endMin + 10),
        windowEnd: minToTime(active[i + 1].startMin - 10),
      })
    }
  }

  // Check end of day
  const last = active[active.length - 1]
  if (last) {
    const remaining = 16 * 60 - last.endMin
    if (remaining >= MIN_GAP) {
      slots.push({
        afterStopIdx: last.sequence - 1,
        gapMin: remaining,
        windowStart: minToTime(last.endMin + 10),
        windowEnd: minToTime(16 * 60),
      })
    }
  }

  return slots
}
