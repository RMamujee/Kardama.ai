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
    <div className="flex w-72 flex-col overflow-hidden border-r border-[#1e2a3a] bg-[#0a0f1c]">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Live Operations</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {cleaners.filter(c => c.status !== 'off-duty').length} active · {jobs.length} jobs shown
        </p>
      </div>

      {/* GPS master control */}
      <div className="border-b border-[#1e2a3a] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">GPS Tracking</span>
          </div>
          {gpsTracking && (
            <div className="flex items-center gap-1.5">
              <span className="gps-dot inline-block h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-blue-400 font-medium">Live</span>
            </div>
          )}
        </div>

        {gpsTracking ? (
          <div className="space-y-1.5">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
              <p className="text-[11px] font-medium text-blue-300">
                {trackedCleaner
                  ? `Tracking ${cleaners.find(c => c.id === trackedCleaner)?.name.split(' ')[0] ?? 'cleaner'}`
                  : 'Device GPS active'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Click a cleaner's GPS button to reassign</p>
            </div>
            <button
              onClick={onStopGPS}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <WifiOff className="h-3 w-3" />
              Stop All Tracking
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartGPS(null)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          >
            <Wifi className="h-3 w-3" />
            Start GPS (this device)
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-[#1e2a3a] p-3 space-y-2">
        <Select value={filterStatus} onChange={e => onFilterStatus(e.target.value)} className="text-xs">
          <option value="all">All job statuses</option>
          <option value="in-progress">In Progress</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
        </Select>
        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
          <input type="checkbox" checked={showCompleted} onChange={e => onToggleCompleted(e.target.checked)}
            className="rounded border-[#1e2a3a] bg-[#0d1321]" />
          Show completed jobs
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cleaners */}
        <div className="p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Cleaners</p>
          <div className="space-y-1.5">
            {cleaners.map(c => {
              const isSelected = selectedCleaner === c.id
              const isTracked  = trackedCleaner === c.id

              return (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg p-2 transition-colors',
                    isSelected ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' : 'hover:bg-white/[0.03]'
                  )}
                >
                  {/* Avatar — clickable to select */}
                  <button className="relative flex-shrink-0" onClick={() => onSelectCleaner(isSelected ? null : c.id)}>
                    <Avatar initials={c.initials} color={c.color} size="sm" />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0a0f1c]"
                      style={{ backgroundColor: c.status === 'available' ? '#10b981' : c.status === 'en-route' ? '#f59e0b' : c.status === 'cleaning' ? '#6366f1' : '#374151' }}
                    />
                    {isTracked && (
                      <span className="gps-dot absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-blue-500 border border-[#0a0f1c]" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectCleaner(isSelected ? null : c.id)}>
                    <p className="text-xs font-medium text-slate-300 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-600 capitalize">{c.homeAreaName}</p>
                  </div>

                  {/* GPS button */}
                  <button
                    onClick={() => handleGpsClick(c.id)}
                    title={isTracked ? 'Stop GPS tracking' : `Track ${c.name.split(' ')[0]} with GPS`}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all flex-shrink-0',
                      isTracked
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-[#1a2537] text-slate-500 hover:text-slate-300 hover:bg-[#253347]'
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

        <Separator className="bg-[#1e2a3a]" />

        {/* Jobs */}
        <div className="p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Jobs</p>
          <div className="space-y-1.5">
            {jobs.map(j => (
              <div key={j.id} className="rounded-lg bg-[#0d1321] border border-[#1e2a3a] p-2.5 hover:border-indigo-500/20 hover:bg-[#111827] transition-colors">
                <p className="text-xs font-medium text-slate-300 truncate">{j.address.split(',')[0]}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{formatTime(j.scheduledTime)} · {getServiceLabel(j.serviceType)}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <Badge variant={(STATUS_BADGE as any)[j.status] || 'neutral'} className="text-[9px] capitalize">{j.status}</Badge>
                  <span className="text-[10px] font-semibold text-emerald-400">{formatCurrency(j.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
