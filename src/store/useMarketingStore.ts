import { create } from 'zustand'
import { MarketingPost, FacebookGroup } from '@/types'
import { FACEBOOK_GROUPS, generateAllPosts, generateAiPost, generatePost, PostTone } from '@/lib/marketing-engine'
import { MarketingTheme } from '@/types'
import { getWeek } from 'date-fns'

type GeneratedSource = 'openai' | 'template' | null

interface MarketingStore {
  posts: MarketingPost[]
  groups: FacebookGroup[]
  selectedGroupIds: Set<string>
  generatingPost: boolean
  generatedContent: string
  generatedSource: GeneratedSource
  selectedWeek: number
  selectedTheme: MarketingTheme
  selectedTone: PostTone
  generatingAll: boolean
  generateAllProgress: number

  generateAiPost: () => Promise<void>
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
  generatedSource: null,
  selectedWeek: getWeek(new Date()),
  selectedTheme: 'social-proof',
  selectedTone: 'friendly',
  generatingAll: false,
  generateAllProgress: 0,

  generateAiPost: async () => {
    const { selectedTheme, selectedTone } = get()
    set({ generatingPost: true, generatedContent: '', generatedSource: null })
    try {
      const res = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme, tone: selectedTone }),
      })
      if (res.ok) {
        const data = await res.json() as { content?: string; source?: GeneratedSource }
        if (data.content) {
          set({ generatingPost: false, generatedContent: data.content, generatedSource: data.source ?? 'template' })
          return
        }
      }
      set({
        generatingPost: false,
        generatedContent: generateAiPost(selectedTheme, selectedTone),
        generatedSource: 'template',
      })
    } catch {
      set({
        generatingPost: false,
        generatedContent: generateAiPost(selectedTheme, selectedTone),
        generatedSource: 'template',
      })
    }
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
