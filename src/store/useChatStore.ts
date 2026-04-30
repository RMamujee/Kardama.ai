import { create } from 'zustand'

export type ChatNotification = {
  id: string
  cleanerId: string
  cleanerName: string
  message: string
  time: string
  read: boolean
}

interface ChatStore {
  unreadMap: Record<string, number>
  totalUnread: number
  selectedCleanerId: string | null
  notifications: ChatNotification[]
  inboxUnread: number
  incrementUnread: (cleanerId: string) => void
  clearUnread: (cleanerId: string) => void
  setSelectedCleaner: (cleanerId: string | null) => void
  addNotification: (n: Omit<ChatNotification, 'id' | 'read'>) => void
  markAllRead: () => void
  setInboxUnread: (count: number) => void
  decrementInboxUnread: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  unreadMap: {},
  totalUnread: 0,
  selectedCleanerId: null,
  notifications: [],
  inboxUnread: 0,
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
  setSelectedCleaner: (cleanerId) => set({ selectedCleanerId: cleanerId }),
  addNotification: (n) =>
    set((s) => ({
      notifications: [{ ...n, id: crypto.randomUUID(), read: false }, ...s.notifications].slice(0, 50),
    })),
  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
  setInboxUnread: (count) => set({ inboxUnread: count }),
  decrementInboxUnread: () =>
    set((s) => ({ inboxUnread: Math.max(0, s.inboxUnread - 1) })),
}))
