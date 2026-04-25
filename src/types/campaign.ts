export type CampaignStatus = 'pending' | 'sent' | 'clicked' | 'booked' | 'expired'
export type CampaignTrigger = 'three-week-followup' | 'inactive-30d' | 'manual'

export interface NurturingCampaign {
  id: string
  customerId: string
  trigger: CampaignTrigger
  scheduledDate: string
  sentAt?: string
  status: CampaignStatus
  message: string
  bookingLinkToken?: string
  lastJobDate: string
  lastJobId: string
  daysSinceLastJob: number
}

export interface BookingSlot {
  date: string
  time: string
  cleanerIds: string[]
  driveTimeMinutes: number
  routeScore: number          // 0-100, higher = more route-efficient
  insertionKm?: number        // extra km to add this job to the route
  insertionLabel?: string     // e.g. "On route (+0.8 km)"
  position?: 'start-of-day' | 'between-jobs' | 'end-of-day'
  label: string               // human-readable datetime label
}

export interface Booking {
  id: string
  token: string
  customerId: string
  customerName: string
  customerPhone: string
  customerAddress: string
  slot: BookingSlot
  cleanerIds: string[]
  cleanerNames: string[]
  confirmedAt: string
  status: 'confirmed' | 'cancelled'
  notes?: string
}

export interface BookingLink {
  token: string
  customerId: string
  createdAt: string
  expiresAt: string
  status: 'active' | 'used' | 'expired'
  slots: BookingSlot[]
}
