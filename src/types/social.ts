export type LeadPlatform = 'facebook-group' | 'facebook-page' | 'instagram' | 'nextdoor' | 'messenger'
export type LeadStatus = 'new' | 'responded' | 'captured' | 'dismissed'
export type LeadUrgency = 'high' | 'medium' | 'low'

export interface SocialLead {
  id: string
  platform: LeadPlatform
  author: string
  authorInitials: string
  groupOrPage: string
  content: string
  postedAt: string
  status: LeadStatus
  location: string
  urgency: LeadUrgency
  respondedAt?: string
  responseUsed?: string
  capturedAt?: string
  likes?: number
  comments?: number
}

export type TemplateCategory = 'intro' | 'promo' | 'follow-up' | 'group-post' | 'instagram'

export interface ResponseTemplate {
  id: string
  title: string
  category: TemplateCategory
  content: string
  platforms: LeadPlatform[]
  tags: string[]
}

export type ComposerPlatform = 'facebook-groups' | 'facebook-page' | 'instagram'

export interface ScheduledPost {
  id: string
  content: string
  platforms: ComposerPlatform[]
  targetGroupIds: string[]
  scheduledAt: string
  status: 'queued' | 'sent' | 'failed'
  hashtags: string[]
}
