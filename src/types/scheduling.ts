export interface SchedulingRequest {
  jobDate: string
  jobTime: string
  jobDuration: number
  jobLat: number
  jobLng: number
  serviceType: string
  customerId: string
  preferredCleanerIds?: string[]
}

export interface RankedTeam {
  cleanerIds: [string, string]
  score: number
  driveTimeMinutes: number
  availabilityConfidence: number
  matchReasons: string[]
  warnings: string[]
  estimatedArrivalBuffer: number
}

export interface SchedulingResult {
  rankedTeams: RankedTeam[]
  reasoning: string
  confidenceScore: number
}
