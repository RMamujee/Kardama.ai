export type LeadSource = 'facebook' | 'yelp' | 'referral' | 'text' | 'repeat'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  lat: number
  lng: number
  city: string
  preferredCleanerIds: string[]
  jobHistory: string[]
  source: LeadSource
  notes: string
  totalSpent: number
  createdAt: string
}
