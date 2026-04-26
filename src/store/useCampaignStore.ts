import { create } from 'zustand'
import { NurturingCampaign, BookingLink, BookingSlot } from '@/types'
import { detectNurturingCandidates, getAvailableSlots } from '@/lib/campaign-engine'

interface CampaignStore {
  campaigns: NurturingCampaign[]
  bookingLinks: BookingLink[]
  selectedCustomerId: string | null
  availableSlots: BookingSlot[]
  loadingSlots: boolean
  sending: string | null

  loadCampaigns: () => void
  markSent: (campaignId: string) => Promise<void>
  generateLink: (customerId: string) => Promise<BookingLink | null>
  selectCustomer: (customerId: string) => void
  clearSelection: () => void
  addManualCampaign: (customerId: string, message: string) => Promise<BookingLink | null>
}

async function fetchSignedToken(customerId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/bookings/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    })
    if (!res.ok) return null
    const { token } = await res.json() as { token: string }
    return token
  } catch {
    return null
  }
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaigns: detectNurturingCandidates(),
  bookingLinks: [],
  selectedCustomerId: null,
  availableSlots: [],
  loadingSlots: false,
  sending: null,

  loadCampaigns: () => set({ campaigns: detectNurturingCandidates() }),

  markSent: async (campaignId) => {
    const { sending, campaigns } = get()
    if (sending) return
    const campaign = campaigns.find(c => c.id === campaignId)
    if (!campaign) return

    set({ sending: campaignId })

    try {
      // Server generates the signed token — never use a client-side token in the SMS (CRIT-3)
      await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: campaign.customerId, message: campaign.message }),
      })
    } catch {
      // SMS unavailable (no env vars) — still mark as sent in UI
    }

    set(s => ({
      sending: null,
      campaigns: s.campaigns.map(c =>
        c.id === campaignId
          ? { ...c, status: 'sent', sentAt: new Date().toISOString() }
          : c
      ),
    }))
  },

  generateLink: async (customerId) => {
    const token = await fetchSignedToken(customerId)
    if (!token) return null

    const slots   = getAvailableSlots(customerId)
    const today   = new Date().toISOString().split('T')[0]
    const expires = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    const link: BookingLink = { token, customerId, createdAt: today, expiresAt: expires, status: 'active', slots }

    set(s => ({ bookingLinks: [link, ...s.bookingLinks.filter(l => l.customerId !== customerId)] }))
    return link
  },

  selectCustomer: (customerId) => {
    set({ selectedCustomerId: customerId, loadingSlots: true, availableSlots: [] })
    setTimeout(() => {
      const slots = getAvailableSlots(customerId)
      set({ availableSlots: slots, loadingSlots: false })
    }, 600)
  },

  clearSelection: () => set({ selectedCustomerId: null, availableSlots: [] }),

  addManualCampaign: async (customerId, message) => {
    const token = await fetchSignedToken(customerId)
    if (!token) return null

    const slots   = getAvailableSlots(customerId)
    const today   = new Date().toISOString().split('T')[0]
    const expires = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    const link: BookingLink = { token, customerId, createdAt: today, expiresAt: expires, status: 'active', slots }

    set(s => ({
      bookingLinks: [link, ...s.bookingLinks],
      campaigns: [
        {
          id: `camp-manual-${customerId}-${Date.now()}`,
          customerId,
          trigger: 'manual',
          scheduledDate: today,
          status: 'pending',
          message,
          bookingLinkToken: token,
          lastJobDate: '',
          lastJobId: '',
          daysSinceLastJob: 0,
        },
        ...s.campaigns,
      ],
    }))
    return link
  },
}))
