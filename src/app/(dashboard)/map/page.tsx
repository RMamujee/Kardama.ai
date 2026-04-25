'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const LiveMapView = dynamic(
  () => import('@/components/map/LiveMapView').then(m => m.LiveMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-xl bg-slate-100">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-slate-500">Loading map...</p>
        </div>
      </div>
    )
  }
)

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-8rem)] -m-6">
      <LiveMapView />
    </div>
  )
}
