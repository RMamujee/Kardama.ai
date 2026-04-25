export type MarketingTheme =
  | 'seasonal-spring' | 'seasonal-summer' | 'seasonal-fall' | 'seasonal-winter'
  | 'promo-discount' | 'promo-referral'
  | 'social-proof' | 'before-after' | 'tips' | 'holiday'

export type PostStatus = 'draft' | 'scheduled' | 'sent'

export interface MarketingPost {
  id: string
  weekNumber: number
  scheduledDate: string
  content: string
  hashtags: string[]
  status: PostStatus
  targetGroupIds: string[]
  theme: MarketingTheme
  engagementEstimate: number
}

export interface FacebookGroup {
  id: string
  name: string
  memberCount: number
  category: 'local-community' | 'home-services' | 'neighborhood' | 'parenting'
  city: string
}
