export type PaymentStatus = 'pending' | 'received' | 'confirmed'

export interface Payment {
  id: string
  jobId: string
  customerId: string
  cleanerIds: string[]
  amount: number
  method: 'zelle' | 'venmo' | 'cash'
  status: PaymentStatus
  confirmationNote: string
  receivedAt: string
  month: string
}
