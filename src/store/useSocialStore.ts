import { create } from 'zustand'
import { SocialLead, LeadStatus, ScheduledPost, ComposerPlatform, ResponseTemplate } from '@/types'
import { SOCIAL_LEADS, RESPONSE_TEMPLATES, SCHEDULED_POSTS_MOCK } from '@/lib/social-leads-data'

interface SocialStore {
  leads: SocialLead[]
  templates: ResponseTemplate[]
  scheduledPosts: ScheduledPost[]

  respondToLead: (leadId: string, templateId: string, message: string) => void
  captureLead: (leadId: string) => void
  dismissLead: (leadId: string) => void
  restoreLead: (leadId: string) => void

  addScheduledPost: (post: Omit<ScheduledPost, 'id' | 'status'>) => void
  removeScheduledPost: (id: string) => void
  markPostSent: (id: string) => void
}

export const useSocialStore = create<SocialStore>((set) => ({
  leads: SOCIAL_LEADS,
  templates: RESPONSE_TEMPLATES,
  scheduledPosts: SCHEDULED_POSTS_MOCK as ScheduledPost[],

  respondToLead: (leadId, templateId, _message) => set(s => ({
    leads: s.leads.map(l =>
      l.id === leadId
        ? { ...l, status: 'responded' as LeadStatus, respondedAt: new Date().toISOString(), responseUsed: templateId }
        : l
    ),
  })),

  captureLead: (leadId) => set(s => ({
    leads: s.leads.map(l =>
      l.id === leadId ? { ...l, status: 'captured' as LeadStatus, capturedAt: new Date().toISOString() } : l
    ),
  })),

  dismissLead: (leadId) => set(s => ({
    leads: s.leads.map(l => l.id === leadId ? { ...l, status: 'dismissed' as LeadStatus } : l),
  })),

  restoreLead: (leadId) => set(s => ({
    leads: s.leads.map(l => l.id === leadId ? { ...l, status: 'new' as LeadStatus } : l),
  })),

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
