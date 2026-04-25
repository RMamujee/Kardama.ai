export type CleanerStatus = 'available' | 'en-route' | 'cleaning' | 'off-duty'
export type ServiceSpecialty = 'deep-clean' | 'move-out' | 'post-construction' | 'airbnb' | 'standard'

export interface Cleaner {
  id: string
  name: string
  initials: string
  phone: string
  email: string
  rating: number
  totalJobs: number
  currentLat: number
  currentLng: number
  homeAreaName: string
  homeAreaLat: number
  homeAreaLng: number
  status: CleanerStatus
  availableHours: {
    [day: string]: { start: string; end: string } | null
  }
  specialties: ServiceSpecialty[]
  reliabilityScore: number
  currentJobId: string | null
  teamId: string
  color: string // hex color for map marker
}
