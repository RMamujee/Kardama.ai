import { create } from 'zustand'
import { Payment } from '@/types'
import { PAYMENTS } from '@/lib/mock-data'

interface PaymentStore {
  payments: Payment[]
  filterMethod: 'all' | 'zelle' | 'venmo' | 'cash'
  filterStatus: 'all' | 'pending' | 'received' | 'confirmed'
  searchQuery: string
  logModalOpen: boolean

  setFilterMethod: (v: PaymentStore['filterMethod']) => void
  setFilterStatus: (v: PaymentStore['filterStatus']) => void
  setSearchQuery: (v: string) => void
  openLogModal: () => void
  closeLogModal: () => void
  addPayment: (p: Omit<Payment, 'id'>) => void
  confirmPayment: (id: string) => void

  getFiltered: () => Payment[]
}

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  payments: PAYMENTS,
  filterMethod: 'all',
  filterStatus: 'all',
  searchQuery: '',
  logModalOpen: false,

  setFilterMethod: (v) => set({ filterMethod: v }),
  setFilterStatus: (v) => set({ filterStatus: v }),
  setSearchQuery: (v) => set({ searchQuery: v }),
  openLogModal: () => set({ logModalOpen: true }),
  closeLogModal: () => set({ logModalOpen: false }),
  addPayment: (p) => set(s => ({ payments: [{ ...p, id: `pay-${Date.now()}` }, ...s.payments] })),
  confirmPayment: (id) => set(s => ({
    payments: s.payments.map(p => p.id === id ? { ...p, status: 'confirmed' as const } : p)
  })),

  getFiltered: () => {
    const { payments, filterMethod, filterStatus, searchQuery } = get()
    return payments.filter(p => {
      if (filterMethod !== 'all' && p.method !== filterMethod) return false
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!p.confirmationNote.toLowerCase().includes(q) && !p.customerId.toLowerCase().includes(q)) return false
      }
      return true
    })
  },
}))
