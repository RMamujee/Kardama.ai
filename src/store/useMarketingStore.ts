import { create } from 'zustand'
import { MarketingPost, FacebookGroup } from '@/types'
import { FACEBOOK_GROUPS } from '@/lib/mock-data'
import { generateAllPosts, generateAiPost, generatePost, PostTone } from '@/lib/marketing-engine'
import { MarketingTheme } from '@/types'
import { getWeek } from 'date-fns'

interface MarketingStore {
  posts: MarketingPost[]
  groups: FacebookGroup[]
  selectedGroupIds: Set<string>
  generatingPost: boolean
  generatedContent: string
  selectedWeek: number
  selectedTheme: MarketingTheme
  selectedTone: PostTone
  generatingAll: boolean
  generateAllProgress: number

  generateAiPost: () => void
  generateAllPosts: () => Promise<void>
  selectGroup: (id: string) => void
  selectAllGroups: () => void
  clearGroups: () => void
  setSelectedWeek: (n: number) => void
  setTheme: (t: MarketingTheme) => void
  setTone: (t: PostTone) => void
  schedulePost: (weekNumber: number) => void
  setGeneratedContent: (c: string) => void
}

export const useMarketingStore = create<MarketingStore>((set, get) => ({
  posts: generateAllPosts(),
  groups: FACEBOOK_GROUPS,
  selectedGroupIds: new Set(FACEBOOK_GROUPS.slice(0, 20).map(g => g.id)),
  generatingPost: false,
  generatedContent: '',
  selectedWeek: getWeek(new Date()),
  selectedTheme: 'social-proof',
  selectedTone: 'friendly',
  generatingAll: false,
  generateAllProgress: 0,

  generateAiPost: () => {
    const { selectedTheme, selectedTone } = get()
    set({ generatingPost: true, generatedContent: '' })
    setTimeout(() => {
      const content = generateAiPost(selectedTheme, selectedTone)
      set({ generatingPost: false, generatedContent: content })
    }, 1200)
  },

  generateAllPosts: async () => {
    set({ generatingAll: true, generateAllProgress: 0 })
    const newPosts = generateAllPosts()
    for (let i = 0; i < 52; i++) {
      await new Promise(r => setTimeout(r, 30))
      set({ generateAllProgress: i + 1 })
    }
    set({ posts: newPosts, generatingAll: false })
  },

  selectGroup: (id) => set(s => {
    const next = new Set(s.selectedGroupIds)
    next.has(id) ? next.delete(id) : next.add(id)
    return { selectedGroupIds: next }
  }),

  selectAllGroups: () => set(s => ({ selectedGroupIds: new Set(s.groups.map(g => g.id)) })),
  clearGroups: () => set({ selectedGroupIds: new Set() }),

  setSelectedWeek: (n) => set({ selectedWeek: n }),
  setTheme: (t) => set({ selectedTheme: t }),
  setTone: (t) => set({ selectedTone: t }),

  schedulePost: (weekNumber) => set(s => ({
    posts: s.posts.map(p => p.weekNumber === weekNumber ? { ...p, status: 'scheduled' as const } : p)
  })),

  setGeneratedContent: (c) => set({ generatedContent: c }),
}))
