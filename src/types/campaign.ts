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
  routeScore: number
  label: string
}

export interface BookingLink {
  token: string
  customerId: string
  createdAt: string
  expiresAt: string
  status: 'active' | 'used' | 'expired'
  slots: BookingSlot[]
}
