'use client'
import { create } from 'zustand'
import { Payment } from '@/types'
import { PAYMENTS } from '@/lib/mock-data'

interface PaymentStore {
  payments: Payment[]
  filterMethod: 'all' | 'zelle' | 'venmo' | 'cash'
  filterStatus: 'all' | 'pending' | 'received' | 'confirmed'
  searchQuery: string
  logModalOpen: boolean

  setPayments: (ps: Payment[]) => void
  setFilterMethod: (v: PaymentStore['filterMethod']) => void
  setFilterStatus: (v: PaymentStore['filterStatus']) => void
  setSearchQuery: (v: string) => void
  openLogModal: () => void
  closeLogModal: () => void
  addPayment: (p: Payment) => void
  markReceived: (id: string) => Promise<void>
  confirmPayment: (id: string) => Promise<void>

  getFiltered: () => Payment[]
}

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  payments: PAYMENTS,
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

  markReceived: async (id) => {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'received' }),
    })
    if (!res.ok) return
    set(s => ({
      payments: s.payments.map(p => p.id === id ? { ...p, status: 'received' as const } : p),
    }))
  },

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
        if (!p.confirmationNote.toLowerCase().includes(q) && !p.customerId.toLowerCase().includes(q)) return false
      }
      return true
    })
  },
}))
