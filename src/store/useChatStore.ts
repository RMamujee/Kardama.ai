import { create } from 'zustand'

interface ChatStore {
  unreadMap: Record<string, number>
  totalUnread: number
  incrementUnread: (cleanerId: string) => void
  clearUnread: (cleanerId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  unreadMap: {},
  totalUnread: 0,
  incrementUnread: (cleanerId) =>
    set((s) => {
      const next = { ...s.unreadMap, [cleanerId]: (s.unreadMap[cleanerId] ?? 0) + 1 }
      return { unreadMap: next, totalUnread: Object.values(next).reduce((a, b) => a + b, 0) }
    }),
  clearUnread: (cleanerId) =>
    set((s) => {
      const next = { ...s.unreadMap, [cleanerId]: 0 }
      return { unreadMap: next, totalUnread: Object.values(next).reduce((a, b) => a + b, 0) }
    }),
}))
