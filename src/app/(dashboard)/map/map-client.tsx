'use client'
import dynamic from 'next/dynamic'
import type { Cleaner, Job } from '@/types'

const LiveMapView = dynamic(
  () => import('@/components/map/LiveMapView').then(m => m.LiveMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-[14px] bg-rail border border-ink-200">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-[13px] text-ink-500">Loading map...</p>
        </div>
      </div>
    )
  }
)

interface Props {
  cleaners: Cleaner[]
  todayJobs: Job[]
}

export function MapClient({ cleaners, todayJobs }: Props) {
  return (
    <div className="h-[calc(100vh-8rem)] -m-3 sm:-m-4 md:-m-6">
      <LiveMapView cleaners={cleaners} todayJobs={todayJobs} />
    </div>
  )
}
