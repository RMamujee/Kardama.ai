'use client'
import { create } from 'zustand'
import { Payment } from '@/types'

interface PaymentStore {
  payments: Payment[]
  filterMethod: 'all' | 'zelle' | 'venmo' | 'cash'
  filterStatus: 'all' | 'pending' | 'confirmed' | 'cancelled'
  searchQuery: string
  logModalOpen: boolean

  setPayments: (ps: Payment[]) => void
  setFilterMethod: (v: PaymentStore['filterMethod']) => void
  setFilterStatus: (v: PaymentStore['filterStatus']) => void
  setSearchQuery: (v: string) => void
  openLogModal: () => void
  closeLogModal: () => void
  addPayment: (p: Payment) => void
  confirmPayment: (id: string) => Promise<void>

  getFiltered: () => Payment[]
}

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  payments: [],
  filterMethod: 'all',
  filterStatus: 'all',
  searchQuery: '',
  logModalOpen: false,

  setPayments: (ps) => set({ payments: ps }),
  setFilterMethod: (v) => set({ filterMethod: v }),
  setFilterStatus: (v) => set({ filterStatus: v }),
  setSearchQuery: (v) => set({ searchQuery: v }),
  openLogModal: () => set({ logModalOpen: true }),
  closeLogModal: () => set({ logModalOpen: false }),
  addPayment: (p) => set(s => ({ payments: [p, ...s.payments] })),

  confirmPayment: async (id) => {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    if (!res.ok) return
    set(s => ({
      payments: s.payments.map(p => p.id === id ? { ...p, status: 'confirmed' as const } : p),
    }))
  },

  getFiltered: () => {
    const { payments, filterMethod, filterStatus, searchQuery } = get()
    return payments.filter(p => {
      if (filterMethod !== 'all' && p.method !== filterMethod) return false
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const inNote = p.confirmationNote.toLowerCase().includes(q)
        const inCustomer = p.customerId?.toLowerCase().includes(q) ?? false
        if (!inNote && !inCustomer) return false
      }
      return true
    })
  },
}))
