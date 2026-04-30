import type { PaymentMethod } from './job'
export type { PaymentMethod }

export type PaymentStatus = 'pending' | 'received' | 'confirmed'

export interface Payment {
  id: string
  jobId: string
  bookingRef?: string
  customerId: string
  cleanerIds: string[]
  amount: number
  method?: PaymentMethod
  status: PaymentStatus
  confirmationNote: string
  receivedAt: string
  month: string
}
