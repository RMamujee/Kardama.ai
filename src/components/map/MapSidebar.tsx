'use client'
import { Cleaner, Job } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select } from '@/components/ui/select'
import { getServiceLabel, formatTime, formatCurrency, cn } from '@/lib/utils'

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
}

export function MapSidebar({ cleaners, jobs, selectedCleaner, onSelectCleaner, showCompleted, onToggleCompleted, filterStatus, onFilterStatus }: MapSidebarProps) {
  return (
    <div className="flex w-72 flex-col overflow-hidden border-r border-[#1e2a3a] bg-[#0a0f1c]">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Live Operations</h2>
        <p className="text-xs text-slate-500 mt-0.5">{cleaners.filter(c=>c.status!=='off-duty').length} active · {jobs.length} jobs shown</p>
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
          <input type="checkbox" checked={showCompleted} onChange={e => onToggleCompleted(e.target.checked)} className="rounded border-[#1e2a3a] bg-[#0d1321]" />
          Show completed jobs
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cleaners section */}
        <div className="p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Cleaners</p>
          <div className="space-y-1.5">
            {cleaners.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCleaner(selectedCleaner === c.id ? null : c.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors',
                  selectedCleaner === c.id ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' : 'hover:bg-white/[0.03]'
                )}
              >
                <div className="relative">
                  <Avatar initials={c.initials} color={c.color} size="sm" />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0a0f1c]"
                    style={{ backgroundColor: c.status === 'available' ? '#10b981' : c.status === 'en-route' ? '#f59e0b' : c.status === 'cleaning' ? '#6366f1' : '#374151' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-600 capitalize">{c.homeAreaName}</p>
                </div>
                <Badge variant={(STATUS_BADGE as any)[c.status] || 'neutral'} className="text-[9px] capitalize">{c.status}</Badge>
              </button>
            ))}
          </div>
        </div>

        <Separator className="bg-[#1e2a3a]" />

        {/* Jobs section */}
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
