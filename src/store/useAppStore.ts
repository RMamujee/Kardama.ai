import { create } from 'zustand'

interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning'
  createdAt: string
}

interface AppStore {
  sidebarCollapsed: boolean
  notifications: Notification[]
  toggleSidebar: () => void
  addNotification: (n: Omit<Notification, 'id'>) => void
  dismissNotification: (id: string) => void
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarCollapsed: false,
  notifications: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  addNotification: (n) => set((s) => ({ notifications: [{ ...n, id: crypto.randomUUID() }, ...s.notifications] })),
  dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),
}))
