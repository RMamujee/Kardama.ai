'use client'
import dynamic from 'next/dynamic'
import type { Cleaner, Job } from '@/types'

const LiveMapView = dynamic(
  () => import('@/components/map/LiveMapView').then(m => m.LiveMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center rounded-[14px] bg-rail border border-ink-200">
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
  allJobs: Job[]
}

export function MapClient({ cleaners, allJobs }: Props) {
  return (
    <div className="h-[calc(100vh-60px)] -mx-5 -my-6 md:-mx-8 md:-my-7 lg:-mx-10 lg:-my-8">
      <LiveMapView cleaners={cleaners} allJobs={allJobs} />
    </div>
  )
}
