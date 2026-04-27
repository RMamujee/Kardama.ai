'use client'
import { Cleaner, Job } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select } from '@/components/ui/select'
import { getServiceLabel, formatTime, formatCurrency, cn } from '@/lib/utils'
import { Navigation, WifiOff, Wifi, Radio } from 'lucide-react'

const STATUS_BADGE = {
  available: 'success', 'en-route': 'warning', cleaning: 'default', 'off-duty': 'neutral',
  scheduled: 'default', confirmed: 'success', 'in-progress': 'warning', completed: 'neutral',
} as const

interface MapSidebarProps {
  cleaners: Cleaner[]
  jobs: Job[]
  selectedCleaner: string | null
  onSelectCleaner: (id: string | null) => void
  showCompleted: boolean
  onToggleCompleted: (v: boolean) => void
  filterStatus: string
  onFilterStatus: (v: string) => void
  // GPS props
  trackedCleaner: string | null
  gpsTracking: boolean
  onStartGPS: (cleanerId: string | null) => void
  onStopGPS: () => void
}

export function MapSidebar({
  cleaners, jobs, selectedCleaner, onSelectCleaner,
  showCompleted, onToggleCompleted, filterStatus, onFilterStatus,
  trackedCleaner, gpsTracking, onStartGPS, onStopGPS,
}: MapSidebarProps) {

  function handleGpsClick(cleanerId: string) {
    if (trackedCleaner === cleanerId) {
      onStopGPS()
    } else {
      if (gpsTracking) onStopGPS()
      onStartGPS(cleanerId)
    }
  }

  return (
    <div className="flex w-72 flex-col overflow-hidden border-r border-ink-200 bg-rail">
      {/* Header */}
      <div className="border-b border-ink-200 p-4">
        <h2 className="text-[14px] font-semibold text-ink-900">Live Operations</h2>
        <p className="text-[12px] text-ink-500 mt-0.5">
          {cleaners.filter(c => c.status !== 'off-duty').length} active · {jobs.length} jobs shown
        </p>
      </div>

      {/* GPS master control */}
      <div className="border-b border-ink-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[12px] font-semibold text-ink-700">GPS Tracking</span>
          </div>
          {gpsTracking && (
            <div className="flex items-center gap-1.5">
              <span className="gps-dot inline-block h-2 w-2 rounded-full bg-violet-500" />
              <span className="text-[11px] text-violet-400 font-medium">Live</span>
            </div>
          )}
        </div>

        {gpsTracking ? (
          <div className="space-y-1.5">
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
              <p className="text-[11px] font-medium text-violet-400">
                {trackedCleaner
                  ? `Tracking ${cleaners.find(c => c.id === trackedCleaner)?.name.split(' ')[0] ?? 'cleaner'}`
                  : 'Device GPS active'}
              </p>
              <p className="text-[11px] text-ink-500 mt-0.5">Click a cleaner's GPS button to reassign</p>
            </div>
            <button
              onClick={onStopGPS}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-[12px] font-medium text-rose-500 hover:bg-rose-500/20 transition-colors"
            >
              <WifiOff className="h-3 w-3" />
              Stop All Tracking
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartGPS(null)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 text-[12px] font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
          >
            <Wifi className="h-3 w-3" />
            Start GPS (this device)
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-ink-200 p-3 space-y-2">
        <Select value={filterStatus} onChange={e => onFilterStatus(e.target.value)} className="text-[12px]">
          <option value="all">All job statuses</option>
          <option value="in-progress">In Progress</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
        </Select>
        <label className="flex items-center gap-2 text-[12px] text-ink-500 cursor-pointer hover:text-ink-400 transition-colors">
          <input type="checkbox" checked={showCompleted} onChange={e => onToggleCompleted(e.target.checked)}
            className="rounded border-ink-200 bg-soft" />
          Show completed jobs
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cleaners */}
        <div className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Cleaners</p>
          <div className="space-y-1.5">
            {cleaners.map(c => {
              const isSelected = selectedCleaner === c.id
              const isTracked  = trackedCleaner === c.id
              const statusDot =
                c.status === 'available' ? 'bg-emerald-500' :
                c.status === 'en-route'  ? 'bg-amber-500'   :
                c.status === 'cleaning'  ? 'bg-violet-500'  :
                                           'bg-ink-200'

              return (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg p-2 transition-colors',
                    isSelected ? 'bg-violet-500/10 ring-1 ring-violet-500/30' : 'hover:bg-hover'
                  )}
                >
                  {/* Avatar — clickable to select */}
                  <button className="relative flex-shrink-0" onClick={() => onSelectCleaner(isSelected ? null : c.id)}>
                    <Avatar initials={c.initials} color={c.color} size="sm" />
                    <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-rail', statusDot)} />
                    {isTracked && (
                      <span className="gps-dot absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-violet-500 border border-rail" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectCleaner(isSelected ? null : c.id)}>
                    <p className="text-[12px] font-medium text-ink-700 truncate">{c.name}</p>
                    <p className="text-[11px] text-ink-400 capitalize">{c.homeAreaName}</p>
                  </div>

                  {/* GPS button */}
                  <button
                    onClick={() => handleGpsClick(c.id)}
                    title={isTracked ? 'Stop GPS tracking' : `Track ${c.name.split(' ')[0]} with GPS`}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors flex-shrink-0',
                      isTracked
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                        : 'bg-soft text-ink-500 hover:text-ink-700 hover:bg-hover'
                    )}
                  >
                    <Navigation className="h-2.5 w-2.5" />
                    {isTracked ? 'Live' : 'GPS'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <Separator className="bg-ink-200" />

        {/* Jobs */}
        <div className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Jobs</p>
          <div className="space-y-1.5">
            {jobs.map(j => (
              <div key={j.id} className="rounded-lg bg-soft border border-ink-200 p-2.5 hover:border-violet-500/20 hover:bg-hover transition-colors">
                <p className="text-[12px] font-medium text-ink-700 truncate">{j.address.split(',')[0]}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">{formatTime(j.scheduledTime)} · {getServiceLabel(j.serviceType)}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <Badge variant={(STATUS_BADGE as any)[j.status] || 'neutral'} className="text-[11px] capitalize">{j.status}</Badge>
                  <span className="text-[11px] font-semibold text-emerald-500">{formatCurrency(j.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
