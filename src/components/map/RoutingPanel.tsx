'use client'
import { useMemo, useState } from 'react'
import { Cleaner } from '@/types'
import { TeamRoute, RouteStop, findRescheduleSlots } from '@/lib/routing-engine'
import { cn } from '@/lib/utils'
import {
  WifiOff, Wifi, Clock, ChevronDown, ChevronUp,
  MessageSquare, X, AlertTriangle, RotateCcw, Send, CheckCircle,
  MapPin, DollarSign, Undo2, UserX, UserCheck, RefreshCw,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────
const DAY_START = 480  // 8:00 AM in minutes
const DAY_END   = 960  // 4:00 PM in minutes
const DAY_SPAN  = DAY_END - DAY_START

const TRAFFIC_DOT: Record<string, string> = {
  clear: 'bg-emerald-500', moderate: 'bg-amber-500', heavy: 'bg-rose-500',
}
const TRAFFIC_TEXT: Record<string, string> = {
  clear: 'text-emerald-500', moderate: 'text-amber-500', heavy: 'text-rose-500',
}
const SERVICE_LABEL: Record<string, string> = {
  standard: 'Standard', deep: 'Deep Clean', 'move-out': 'Move-Out',
  'post-construction': 'Post-Const.', airbnb: 'Airbnb',
}

type MsgTemplate = 'on-way' | 'almost' | 'arrived' | 'complete'

function buildMsg(t: MsgTemplate, stop: RouteStop, teamName: string): string {
  const a = stop.job.address.split(',')[0]
  const eta = stop.startTime
  if (t === 'on-way')  return `Hi! ${teamName} is on the way to ${a}. Estimated arrival: ${eta}.`
  if (t === 'almost')  return `Hi! ${teamName} is about 10 minutes away from ${a}. Please make sure access is ready!`
  if (t === 'arrived') return `${teamName} has arrived at ${a} and is starting your service now.`
  return `Your cleaning at ${a} is complete! Thank you for choosing Kardama. ✨`
}

// ─── Timeline bar ─────────────────────────────────────────────────────────────
function TimelineBar({ stops, color }: { stops: RouteStop[]; color: string }) {
  const [expanded, setExpanded] = useState(false)

  const pct  = (m: number) => `${Math.max(0, Math.min(100, ((m - DAY_START) / DAY_SPAN) * 100)).toFixed(2)}%`
  const wPct = (a: number, b: number) => `${Math.max(0, ((Math.min(b, DAY_END) - Math.max(a, DAY_START)) / DAY_SPAN) * 100).toFixed(2)}%`
  const wNum = (a: number, b: number) => Math.max(0, ((Math.min(b, DAY_END) - Math.max(a, DAY_START)) / DAY_SPAN) * 100)

  const DRIVE_BG: Record<string, string> = {
    heavy: 'rgba(239,68,68,0.35)', moderate: 'rgba(251,191,36,0.4)', clear: 'rgba(52,211,153,0.3)',
  }
  const active = stops.filter(s => s.status !== 'cancelled')

  return (
    <div className="px-3 pb-2.5">
      {/* Hour labels + expand toggle */}
      <div className="flex items-center mb-0.5">
        <div className="flex-1 flex justify-between text-[11px] text-ink-500 px-0.5">
          <span>8am</span><span>10</span><span>noon</span><span>2pm</span><span>4pm</span>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-2 flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-ink-500 hover:text-ink-700 hover:bg-hover transition-colors"
          title={expanded ? 'Collapse timeline' : 'Expand timeline'}
        >
          {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </button>
      </div>

      {/* Timeline track */}
      <div
        className="relative rounded bg-soft overflow-hidden transition-[height] duration-300"
        style={{ height: expanded ? '88px' : '20px' }}
      >
        {[9,10,11,12,13,14,15].map(h => (
          <div key={h} className="absolute top-0 bottom-0 w-px bg-ink-100"
            style={{ left: pct(h * 60) }} />
        ))}

        {active.map((stop, i) => {
          const driveFrom = i === 0 ? DAY_START : active[i - 1].endMin
          const driveTo   = stop.arrivalMin
          if (driveTo <= driveFrom) return null
          return (
            <div key={`d${i}`} className="absolute top-0 h-full"
              style={{ left: pct(driveFrom), width: wPct(driveFrom, driveTo), background: DRIVE_BG[stop.drive.traffic] }} />
          )
        })}

        {active.map(stop => {
          const blockW = wNum(stop.startMin, stop.endMin)
          return (
            <div key={stop.job.id}
              className="absolute overflow-hidden"
              style={{
                left: pct(stop.startMin),
                width: wPct(stop.startMin, stop.endMin),
                top: expanded ? '4px' : '2px',
                bottom: expanded ? '4px' : '2px',
                background: color,
                borderRadius: '3px',
              }}
              title={`Stop ${stop.sequence} · ${stop.startTime}–${stop.arrivalTime} · ${stop.job.address.split(',')[0]} · ${stop.job.estimatedDuration}min`}
            >
              {expanded && (
                <div className="flex flex-col justify-between h-full px-1.5 py-1 select-none">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-white/25 text-[7px] font-bold text-white flex-shrink-0">
                      {stop.sequence}
                    </span>
                    {blockW > 12 && (
                      <span className="text-[8px] font-semibold text-white/90 truncate">{stop.startTime}</span>
                    )}
                  </div>
                  {blockW > 10 && (
                    <p className="text-[7px] text-white/75 truncate leading-tight">
                      {stop.job.address.split(',')[0]}
                    </p>
                  )}
                  {blockW > 14 && (
                    <p className="text-[7px] text-white/60 truncate">{stop.job.estimatedDuration}min · {SERVICE_LABEL[stop.job.serviceType]}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {active.map(stop => stop.waitMin > 0 ? (
          <div key={`w${stop.job.id}`}
            className="absolute top-0 h-full bg-ink-300/20"
            style={{ left: pct(stop.arrivalMin), width: wPct(stop.arrivalMin, stop.startMin) }}
            title={`${stop.waitMin} min wait`}
          />
        ) : null)}
      </div>

      <div className="flex items-center gap-3 mt-1">
        <div className="flex items-center gap-1">
          <div className="h-2 w-3 rounded-sm" style={{ background: color }} />
          <span className="text-[11px] text-ink-400">Job</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-3 rounded-sm bg-emerald-500/30" />
          <span className="text-[11px] text-ink-400">Drive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-3 rounded-sm bg-rose-500/35" />
          <span className="text-[11px] text-ink-400">Heavy</span>
        </div>
      </div>
    </div>
  )
}

// ─── SMS Composer ─────────────────────────────────────────────────────────────
function MsgComposer({ stop, teamName, onClose }: { stop: RouteStop; teamName: string; onClose: () => void }) {
  const [tpl, setTpl] = useState<MsgTemplate>('on-way')
  const [text, setText] = useState(() => buildMsg('on-way', stop, teamName))
  const [sent, setSent] = useState(false)

  const TEMPLATES: { id: MsgTemplate; label: string }[] = [
    { id: 'on-way', label: 'On the Way' },
    { id: 'almost', label: '10 min away' },
    { id: 'arrived', label: 'Arrived' },
    { id: 'complete', label: 'Complete' },
  ]

  return (
    <div className="mt-1.5 rounded-lg border border-violet-500/20 bg-soft p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-ink-400">Notify client</p>
        <button onClick={onClose}><X className="h-3 w-3 text-ink-400 hover:text-ink-700" /></button>
      </div>
      <div className="flex flex-wrap gap-1">
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => { setTpl(t.id); setText(buildMsg(t.id, stop, teamName)) }}
            className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium border transition-colors',
              tpl === t.id ? 'border-violet-500/40 bg-violet-500/15 text-violet-400'
                           : 'border-ink-200 text-ink-400 hover:text-ink-700'
            )}>{t.label}</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        className="w-full resize-none rounded border border-ink-200 bg-card px-2 py-1 text-[11px] text-ink-700 leading-relaxed focus:outline-none focus:border-violet-500/40" />
      <button onClick={() => { setSent(true); setTimeout(onClose, 1000) }} disabled={sent}
        className={cn('w-full flex items-center justify-center gap-1 rounded py-1 text-[11px] font-semibold transition-colors',
          sent ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
               : 'bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20'
        )}>
        {sent ? <><CheckCircle className="h-3 w-3" /> Sent!</> : <><Send className="h-3 w-3" /> Send SMS</>}
      </button>
    </div>
  )
}

// ─── Stop row ─────────────────────────────────────────────────────────────────
function StopRow({ stop, teamColor, teamName, isCancelled, onCancel, onUncancel, onFlyTo }: {
  stop: RouteStop; teamColor: string; teamName: string
  isCancelled: boolean
  onCancel: () => void; onUncancel: () => void; onFlyTo: () => void
}) {
  const [msgOpen, setMsgOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)

  if (stop.status === 'cancelled' || isCancelled) return (
    <div className="flex items-center gap-2 py-1.5 px-1">
      <div className="h-5 w-5 rounded-full bg-ink-200 flex items-center justify-center text-[11px] text-ink-400 font-bold flex-shrink-0">×</div>
      <span className="text-[11px] text-ink-400 line-through truncate flex-1">{stop.job.address.split(',')[0]}</span>
      <button onClick={onUncancel}
        title="Restore"
        className="flex items-center gap-0.5 rounded border border-ink-200 px-1.5 py-0.5 text-[11px] text-ink-500 hover:text-ink-700 hover:border-ink-300 transition-colors flex-shrink-0">
        <Undo2 className="h-2.5 w-2.5" /> Restore
      </button>
    </div>
  )

  return (
    <div className="rounded-lg border border-ink-200 bg-soft overflow-hidden">
      <div className="flex items-start gap-2 p-2">
        <button onClick={onFlyTo}
          className="mt-0.5 flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white transition-transform hover:scale-110"
          style={{ background: teamColor }}>
          {stop.status === 'complete' ? '✓' : stop.sequence}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink-900 truncate">{stop.job.address.split(',')[0]}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[11px] text-ink-500 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{stop.startTime}
            </span>
            <span className="text-[11px] text-ink-300">·</span>
            <span className="text-[11px] text-ink-500">{stop.job.estimatedDuration}min</span>
            <span className="text-[11px] text-ink-300">·</span>
            <span className="text-[11px] text-ink-500">{SERVICE_LABEL[stop.job.serviceType] ?? stop.job.serviceType}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-[11px] font-medium', TRAFFIC_TEXT[stop.drive.traffic])}>
              {stop.drive.minutes}min drive
            </span>
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full flex-shrink-0', TRAFFIC_DOT[stop.drive.traffic])} />
            <span className="text-[11px] text-emerald-500 font-semibold ml-auto">${stop.job.price}</span>
          </div>
          {stop.waitMin > 5 && (
            <p className="text-[11px] text-amber-500 mt-0.5">{stop.waitMin}min wait before start</p>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
          <button onClick={() => { setMsgOpen(v => !v); setConfirm(false) }}
            className={cn('h-6 w-6 flex items-center justify-center rounded border transition-colors',
              msgOpen ? 'border-violet-500/40 bg-violet-500/15 text-violet-400'
                      : 'border-ink-200 text-ink-400 hover:text-violet-400'
            )}><MessageSquare className="h-2.5 w-2.5" /></button>

          {stop.status !== 'complete' && (
            confirm
              ? <button onClick={() => { setConfirm(false); onCancel() }}
                  className="h-6 w-6 flex items-center justify-center rounded border border-rose-500/40 bg-rose-500/15 text-rose-500 transition-colors">
                  <AlertTriangle className="h-2.5 w-2.5" /></button>
              : <button onClick={() => setConfirm(true)}
                  className="h-6 w-6 flex items-center justify-center rounded border border-ink-200 text-ink-400 hover:text-rose-500 hover:border-rose-500/20 transition-colors">
                  <X className="h-2.5 w-2.5" /></button>
          )}
        </div>
      </div>

      {msgOpen && (
        <div className="px-2 pb-2">
          <MsgComposer stop={stop} teamName={teamName} onClose={() => setMsgOpen(false)} />
        </div>
      )}
    </div>
  )
}

// ─── Team card ────────────────────────────────────────────────────────────────
function TeamCard({ route, overrides, onSetStopStatus, onFlyTo, onMarkUnavailable, isSelected, onFocus }: {
  route: TeamRoute
  overrides: Record<string, RouteStop['status']>
  onSetStopStatus: (jobId: string, status: RouteStop['status'] | null) => void
  onFlyTo: (lat: number, lng: number) => void
  onMarkUnavailable: () => void
  isSelected: boolean
  onFocus: () => void
}) {
  const [open, setOpen] = useState(false)
  const active = route.stops.filter(s => s.status !== 'cancelled')
  const revenue = active.reduce((s, x) => s + x.job.price, 0)
  const slots = findRescheduleSlots(route.stops)
  const teamName = route.cleanerNames.join(' & ')

  return (
    <div className={cn('rounded-[14px] border overflow-hidden transition-colors', isSelected ? 'border-ink-400' : 'border-ink-200')}>
      {/* Header: team name + actions — split so buttons aren't nested */}
      <div className={cn('flex items-start gap-2.5 p-3 transition-colors', isSelected ? 'bg-hover' : 'bg-card hover:bg-hover')}>
        <div className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: route.color }} />
        <button onClick={() => { setOpen(v => !v); onFocus() }} className="flex-1 min-w-0 text-left">
          <p className="text-[12px] font-semibold text-ink-900 truncate">{teamName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-ink-500">{active.length} stops</span>
            <span className="text-[11px] text-ink-300">·</span>
            <span className="text-[11px] text-ink-500">{route.totalDriveMin}min drive</span>
            <span className="text-[11px] text-ink-300">·</span>
            <span className="text-[11px] text-ink-500">{route.totalKm}km</span>
            <span className="text-[11px] text-ink-300">·</span>
            <span className="text-[11px] font-semibold text-emerald-500">${revenue}</span>
            <span className="ml-auto text-[11px] text-ink-400">{route.efficiency}% util</span>
          </div>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <button
            onClick={onMarkUnavailable}
            title="Mark team unavailable — jobs will be redistributed"
            className="h-6 w-6 flex items-center justify-center rounded border border-ink-200 text-ink-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors"
          >
            <UserX className="h-2.5 w-2.5" />
          </button>
          <button onClick={() => setOpen(v => !v)} className="h-6 w-6 flex items-center justify-center">
            {open ? <ChevronUp className="h-3.5 w-3.5 text-ink-400" /> : <ChevronDown className="h-3.5 w-3.5 text-ink-400" />}
          </button>
        </div>
      </div>

      <TimelineBar stops={route.stops} color={route.color} />

      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-ink-200 pt-2.5">
          {route.stops.map(stop => (
            <StopRow key={stop.job.id} stop={stop}
              teamColor={route.color} teamName={teamName}
              isCancelled={overrides[stop.job.id] === 'cancelled'}
              onCancel={() => onSetStopStatus(stop.job.id, 'cancelled')}
              onUncancel={() => onSetStopStatus(stop.job.id, null)}
              onFlyTo={() => onFlyTo(stop.job.lat, stop.job.lng)}
            />
          ))}

          {slots.length > 0 && (
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <RotateCcw className="h-3 w-3 text-emerald-500" />
                <p className="text-[11px] font-semibold text-emerald-500">Available windows</p>
              </div>
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-ink-700">{slot.windowStart} – {slot.windowEnd}</span>
                  <span className="text-[11px] font-semibold text-emerald-500">{slot.gapMin}min open</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  routes: TeamRoute[]
  cleaners: Cleaner[]
  unavailableTeamIds: Set<string>
  onToggleTeamAvailability: (teamId: string) => void
  overrides: Record<string, RouteStop['status']>
  onSetStopStatus: (jobId: string, status: RouteStop['status'] | null) => void
  gpsTracking: boolean
  trackedCleaner: string | null
  onStartGPS: (cleanerId: string | null) => void
  onStopGPS: () => void
  onFlyTo: (lat: number, lng: number) => void
  selectedTeamId: string | null
  onFocusTeam: (teamId: string) => void
  selectedDate: string
  isToday: boolean
  hasGoogleData: boolean
  loadingRoutes: boolean
  onSeedDemo?: () => void
  seedingDemo?: boolean
}

// ─── RoutingPanel ─────────────────────────────────────────────────────────────
export function RoutingPanel({
  routes, cleaners, unavailableTeamIds, onToggleTeamAvailability,
  overrides, onSetStopStatus,
  gpsTracking, trackedCleaner, onStartGPS, onStopGPS, onFlyTo,
  selectedTeamId, onFocusTeam, selectedDate, isToday,
  hasGoogleData, loadingRoutes, onSeedDemo, seedingDemo,
}: Props) {
  const dateLabel = isToday
    ? 'Today'
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const totalJobs = routes.reduce((s, r) => s + r.stops.filter(x => x.status !== 'cancelled').length, 0)
  const totalKm   = routes.reduce((s, r) => s + r.totalKm, 0)
  const totalRev  = routes.reduce((s, r) => s + r.stops.filter(x => x.status !== 'cancelled').reduce((a, x) => a + x.job.price, 0), 0)
  const cancelledCount = Object.values(overrides).filter(s => s === 'cancelled').length

  // Groups of cleaners for each unavailable team (for the restore section).
  const unavailableTeamGroups = useMemo(() => {
    const map = new Map<string, Cleaner[]>()
    for (const c of cleaners) {
      if (!unavailableTeamIds.has(c.teamId)) continue
      if (!map.has(c.teamId)) map.set(c.teamId, [])
      map.get(c.teamId)!.push(c)
    }
    return [...map.entries()].map(([teamId, members]) => ({ teamId, members }))
  }, [cleaners, unavailableTeamIds])

  return (
    <div className="flex w-72 flex-col overflow-hidden border-r border-ink-200 bg-rail">
      <div className="border-b border-ink-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink-900">Dispatch</h2>
          <div className="flex items-center gap-1.5">
            {routes.length > 0 && (
              loadingRoutes
                ? <span className="text-[10px] text-ink-400 animate-pulse">Routing…</span>
                : hasGoogleData
                  ? <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">Google</span>
                  : <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-500">Estimated</span>
            )}
            <span className="text-[12px] text-ink-500">{dateLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-ink-700">{routes.length}</span>
            <span className="text-[11px] text-ink-400">teams</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-ink-700">{totalJobs}</span>
            <span className="text-[11px] text-ink-400">jobs</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-emerald-500">${totalRev}</span>
            <span className="text-[11px] text-ink-400">est.</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-ink-700">{totalKm.toFixed(0)}</span>
            <span className="text-[11px] text-ink-400">km</span>
          </div>
        </div>
        <p className="text-[11px] text-ink-400 mt-1">8:00 AM – 4:00 PM · 5 teams of 2</p>
        {unavailableTeamIds.size > 0 && (
          <p className="text-[11px] text-rose-400 mt-1">
            ⚠ {unavailableTeamIds.size} team{unavailableTeamIds.size > 1 ? 's' : ''} unavailable · jobs redistributed
          </p>
        )}
        {cancelledCount > 0 && (
          <p className="text-[11px] text-amber-500 mt-1">{cancelledCount} stop{cancelledCount > 1 ? 's' : ''} cancelled (saved for today)</p>
        )}
      </div>

      {isToday && (
        <div className="border-b border-ink-200 p-3">
          {gpsTracking ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="gps-dot inline-block h-2 w-2 rounded-full bg-violet-500" />
                  <span className="text-[11px] font-medium text-violet-400">
                    {trackedCleaner ? `Tracking ${cleaners.find(c => c.id === trackedCleaner)?.name.split(' ')[0]}` : 'GPS Active'}
                  </span>
                </div>
                <button onClick={onStopGPS}
                  className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-500 hover:bg-rose-500/20 transition-colors">
                  <WifiOff className="h-2.5 w-2.5" /> Stop
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button onClick={() => onStartGPS(null)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 text-[12px] font-medium text-violet-400 hover:bg-violet-500/20 transition-colors">
                <Wifi className="h-3 w-3" /> Start GPS (this device)
              </button>
              <div className="grid grid-cols-2 gap-1">
                {cleaners.map(c => (
                  <button key={c.id} onClick={() => onStartGPS(c.id)}
                    className="flex items-center gap-1.5 rounded border border-ink-200 px-2 py-1 text-[11px] font-medium text-ink-500 hover:text-ink-700 hover:border-ink-300 transition-colors truncate">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    {c.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {routes.length === 0 && unavailableTeamGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
            <MapPin className="h-8 w-8 text-ink-300" />
            <div>
              <p className="text-[12px] text-ink-400">No routes for {dateLabel}</p>
              <p className="text-[11px] text-ink-400 mt-1">Jobs scheduled for this day will appear here</p>
            </div>
            {onSeedDemo && (
              <button
                onClick={onSeedDemo}
                disabled={seedingDemo}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  seedingDemo
                    ? 'border-ink-200 text-ink-400 cursor-not-allowed'
                    : 'border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                )}
              >
                <RefreshCw className={cn('h-3 w-3', seedingDemo && 'animate-spin')} />
                {seedingDemo ? 'Loading…' : 'Load demo routes'}
              </button>
            )}
          </div>
        ) : (
          <>
            {routes.map(route => (
              <TeamCard key={route.teamId} route={route}
                overrides={overrides}
                onSetStopStatus={onSetStopStatus}
                onFlyTo={onFlyTo}
                onMarkUnavailable={() => onToggleTeamAvailability(route.teamId)}
                isSelected={selectedTeamId === route.teamId}
                onFocus={() => onFocusTeam(route.teamId)} />
            ))}

            {unavailableTeamGroups.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400 px-1">
                  Unavailable
                </p>
                {unavailableTeamGroups.map(({ teamId, members }) => (
                  <div key={teamId} className="rounded-[14px] border border-rose-500/20 bg-rose-500/5 overflow-hidden">
                    <div className="flex items-center gap-2.5 p-3">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-rose-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-ink-500 truncate">
                          {members.map(c => c.name.split(' ')[0]).join(' & ')}
                        </p>
                        <p className="text-[11px] text-rose-400 mt-0.5">Emergency — jobs redistributed</p>
                      </div>
                      <button
                        onClick={() => onToggleTeamAvailability(teamId)}
                        className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                      >
                        <UserCheck className="h-2.5 w-2.5" /> Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-ink-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-ink-400">
            <DollarSign className="h-2.5 w-2.5" />
            <span>Tap ① to fly to stop · 💬 to notify client · × to cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
