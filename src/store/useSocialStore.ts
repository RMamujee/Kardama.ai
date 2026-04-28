import { create } from 'zustand'
import { SocialLead, LeadStatus, ScheduledPost, ComposerPlatform, ResponseTemplate } from '@/types'
import { SOCIAL_LEADS, RESPONSE_TEMPLATES, SCHEDULED_POSTS_MOCK } from '@/lib/social-leads-data'

interface NewLead {
  platform: SocialLead['platform']
  author: string
  groupOrPage: string
  content: string
  location: string
  urgency: SocialLead['urgency']
}

interface SocialStore {
  leads: SocialLead[]
  templates: ResponseTemplate[]
  scheduledPosts: ScheduledPost[]
  leadsLoading: boolean
  leadsError: string | null

  fetchLeads: () => Promise<void>
  addLead: (lead: NewLead) => Promise<void>

  respondToLead: (leadId: string, templateId: string, message: string) => void
  captureLead: (leadId: string) => void
  dismissLead: (leadId: string) => void
  restoreLead: (leadId: string) => void

  addScheduledPost: (post: Omit<ScheduledPost, 'id' | 'status'>) => void
  removeScheduledPost: (id: string) => void
  markPostSent: (id: string) => void
}

async function patchLead(id: string, update: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
  } catch {
    // Optimistic update already applied — silently fail
  }
}

export const useSocialStore = create<SocialStore>((set, get) => ({
  // Start with mock data so the UI renders immediately before the API call completes
  leads: SOCIAL_LEADS,
  templates: RESPONSE_TEMPLATES,
  scheduledPosts: SCHEDULED_POSTS_MOCK as ScheduledPost[],
  leadsLoading: false,
  leadsError: null,

  addLead: async (lead) => {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: lead.platform,
        author: lead.author,
        group_or_page: lead.groupOrPage,
        content: lead.content,
        location: lead.location,
        urgency: lead.urgency,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error ?? 'Failed to save lead')
    }
    // Re-fetch so the new lead appears with its real DB id
    await get().fetchLeads()
  },

  fetchLeads: async () => {
    set({ leadsLoading: true, leadsError: null })
    try {
      const res = await fetch('/api/leads')
      if (!res.ok) {
        // API returned an error (e.g. not logged in, Supabase not configured)
        // Fall back to mock data silently so the page still works
        set({ leadsLoading: false })
        return
      }
      const data = await res.json() as { leads?: SocialLead[] }
      if (Array.isArray(data.leads) && data.leads.length > 0) {
        set({ leads: data.leads, leadsLoading: false })
      } else {
        // No real leads yet — keep showing mock data so the UI isn't empty
        set({ leadsLoading: false })
      }
    } catch {
      // Network error or JSON parse failure — keep mock data
      set({ leadsLoading: false })
    }
  },

  respondToLead: (leadId, templateId, _message) => {
    const now = new Date().toISOString()
    // Optimistic update
    set(s => ({
      leads: s.leads.map(l =>
        l.id === leadId
          ? { ...l, status: 'responded' as LeadStatus, respondedAt: now, responseUsed: templateId }
          : l
      ),
    }))
    // Persist to DB (fire and forget)
    patchLead(leadId, { status: 'responded', responded_at: now, response_used: templateId })
  },

  captureLead: (leadId) => {
    const now = new Date().toISOString()
    set(s => ({
      leads: s.leads.map(l =>
        l.id === leadId ? { ...l, status: 'captured' as LeadStatus, capturedAt: now } : l
      ),
    }))
    patchLead(leadId, { status: 'captured', captured_at: now })
  },

  dismissLead: (leadId) => {
    set(s => ({
      leads: s.leads.map(l => l.id === leadId ? { ...l, status: 'dismissed' as LeadStatus } : l),
    }))
    patchLead(leadId, { status: 'dismissed' })
  },

  restoreLead: (leadId) => {
    set(s => ({
      leads: s.leads.map(l => l.id === leadId ? { ...l, status: 'new' as LeadStatus } : l),
    }))
    patchLead(leadId, { status: 'new' })
  },

  addScheduledPost: (post) => set(s => ({
    scheduledPosts: [
      ...s.scheduledPosts,
      { ...post, id: `sp-${Date.now()}`, status: 'queued' as const },
    ],
  })),

  removeScheduledPost: (id) => set(s => ({
    scheduledPosts: s.scheduledPosts.filter(p => p.id !== id),
  })),

  markPostSent: (id) => set(s => ({
    scheduledPosts: s.scheduledPosts.map(p => p.id === id ? { ...p, status: 'sent' as const } : p),
  })),
}))
