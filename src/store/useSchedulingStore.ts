import { create } from 'zustand'
import { Job, SchedulingRequest, RankedTeam, SchedulingResult } from '@/types'
import { JOBS } from '@/lib/mock-data'
import { computeSchedulingRecommendations } from '@/lib/scheduling-engine'

interface SchedulingStore {
  jobs: Job[]
  weekOffset: number
  bookingOpen: boolean
  bookingStep: number
  pendingRequest: SchedulingRequest | null
  recommendations: RankedTeam[]
  selectedTeam: [string, string] | null

  setWeekOffset: (n: number) => void
  openBooking: () => void
  closeBooking: () => void
  nextStep: () => void
  prevStep: () => void
  setStep: (n: number) => void
  setPendingRequest: (r: SchedulingRequest) => void
  computeRecommendations: (r: SchedulingRequest) => SchedulingResult
  selectTeam: (ids: [string, string]) => void
  addJob: (j: Omit<Job, 'id' | 'createdAt'>) => void
}

export const useSchedulingStore = create<SchedulingStore>((set, get) => ({
  jobs: JOBS,
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
  computeRecommendations: (r) => {
    const result = computeSchedulingRecommendations(r)
    set({ recommendations: result.rankedTeams })
    return result
  },
  selectTeam: (ids) => set({ selectedTeam: ids }),
  addJob: (j) => {
    const job: Job = { ...j, id: `j-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }
    set((s) => ({ jobs: [...s.jobs, job] }))
  },
}))
