import { create } from 'zustand'
import { Cleaner, Customer, Job, SchedulingRequest, RankedTeam, SchedulingResult } from '@/types'
import { computeSchedulingRecommendations } from '@/lib/scheduling-engine'

interface SchedulingStore {
  weekOffset: number
  bookingOpen: boolean
  bookingStep: number
  pendingRequest: SchedulingRequest | null
  recommendations: RankedTeam[]
  selectedTeam: string[] | null

  setWeekOffset: (n: number) => void
  openBooking: () => void
  closeBooking: () => void
  nextStep: () => void
  prevStep: () => void
  setStep: (n: number) => void
  setPendingRequest: (r: SchedulingRequest) => void
  computeRecommendations: (r: SchedulingRequest, cleaners: Cleaner[], jobs: Job[], customers: Customer[]) => SchedulingResult
  selectTeam: (ids: string[]) => void
}

export const useSchedulingStore = create<SchedulingStore>((set) => ({
  weekOffset: 0,
  bookingOpen: false,
  bookingStep: 0,
  pendingRequest: null,
  recommendations: [],
  selectedTeam: null,

  setWeekOffset: (n) => set({ weekOffset: n }),
  openBooking: () => set({ bookingOpen: true, bookingStep: 0, pendingRequest: null, recommendations: [], selectedTeam: null }),
  closeBooking: () => set({ bookingOpen: false }),
  nextStep: () => set((s) => ({ bookingStep: Math.min(3, s.bookingStep + 1) })),
  prevStep: () => set((s) => ({ bookingStep: Math.max(0, s.bookingStep - 1) })),
  setStep: (n) => set({ bookingStep: n }),
  setPendingRequest: (r) => set({ pendingRequest: r }),
  computeRecommendations: (r, cleaners, jobs, customers) => {
    const result = computeSchedulingRecommendations(r, cleaners, jobs, customers)
    set({ recommendations: result.rankedTeams })
    return result
  },
  selectTeam: (ids) => set({ selectedTeam: ids }),
}))
