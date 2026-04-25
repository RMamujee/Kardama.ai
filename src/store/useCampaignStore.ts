import { create } from 'zustand'
import { NurturingCampaign, BookingLink, BookingSlot } from '@/types'
import { detectNurturingCandidates, generateBookingLink, getAvailableSlots } from '@/lib/campaign-engine'

interface CampaignStore {
  campaigns: NurturingCampaign[]
  bookingLinks: BookingLink[]
  selectedCustomerId: string | null
  availableSlots: BookingSlot[]
  loadingSlots: boolean
  sending: string | null // campaign id being "sent"

  loadCampaigns: () => void
  markSent: (campaignId: string) => Promise<void>
  generateLink: (customerId: string) => BookingLink
  selectCustomer: (customerId: string) => void
  clearSelection: () => void
  addManualCampaign: (customerId: string, message: string) => void
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
      await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: campaign.customerId,
          message: campaign.message,
          bookingLinkToken: campaign.bookingLinkToken,
        }),
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

  generateLink: (customerId) => {
    const link = generateBookingLink(customerId)
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

  addManualCampaign: (customerId, message) => {
    const { campaigns } = get()
    const link = generateBookingLink(customerId)
    set(s => ({
      bookingLinks: [link, ...s.bookingLinks],
      campaigns: [
        {
          id: `camp-manual-${customerId}-${Date.now()}`,
          customerId,
          trigger: 'manual',
          scheduledDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          message,
          bookingLinkToken: link.token,
          lastJobDate: '',
          lastJobId: '',
          daysSinceLastJob: 0,
        },
        ...campaigns,
      ],
    }))
    return link
  },
}))
