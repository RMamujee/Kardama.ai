export type SmsDirection = 'outbound' | 'inbound'
export type SmsStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'received'

export interface SmsRecord {
  id: string
  to: string
  from: string
  body: string
  direction: SmsDirection
  status: SmsStatus
  twilioSid?: string
  jobId?: string
  customerId?: string
  template?: string
  sentAt: string
  errorMessage?: string
}
