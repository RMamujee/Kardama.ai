export type JobStatus = 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
export type ServiceType = 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb'
export type PaymentMethod = 'zelle' | 'venmo' | 'cash'

export interface Job {
  id: string
  customerId: string
  cleanerIds: string[]
  scheduledDate: string
  scheduledTime: string
  estimatedDuration: number
  actualDuration?: number
  status: JobStatus
  serviceType: ServiceType
  price: number
  paid: boolean
  paymentMethod?: PaymentMethod
  paymentConfirmationId?: string
  address: string
  lat: number
  lng: number
  notes: string
  driveTimeMinutes: number
  createdAt: string
  teamId?: string | null
}
