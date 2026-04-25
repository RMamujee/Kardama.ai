'use client'
import { useState } from 'react'
import { Cleaner } from '@/types'
import { TeamRoute, RouteStop, findRescheduleSlots } from '@/lib/routing-engine'
import { cn } from '@/lib/utils'
import {
  Navigation, WifiOff, Wifi, Clock, ChevronDown, ChevronUp,
  MessageSquare, X, AlertTriangle, RotateCcw, Send, CheckCircle,
  MapPin, DollarSign,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────
const DAY_START = 480  // 8:00 AM in minutes
const DAY_END   = 960  // 4:00 PM in minutes
const DAY_SPAN  = DAY_END - DAY_START

const TRAFFIC_DOT: Record<string, string> = {
  clear: 'bg-emerald-500', moderate: 'bg-amber-400', heavy: 'bg-red-500',
}
const TRAFFIC_TEXT: Record<string, string> = {
  clear: 'text-emerald-600', moderate: 'text-amber-600', heavy: 'text-red-600',
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
  const pct = (m: number) => `${Math.max(0, Math.min(100, ((m - DAY_START) / DAY_SPAN) * 100)).toFixed(2)}%`
  const wPct = (a: number, b: number) => `${Math.max(0, ((Math.min(b, DAY_END) - Math.max(a, DAY_START)) / DAY_SPAN) * 100).toFixed(2)}%`

  const DRIVE_BG: Record<string, string> = {
    heavy: 'rgba(239,68,68,0.35)', moderate: 'rgba(251,191,36,0.4)', clear: 'rgba(52,211,153,0.3)',
  }
  const active = stops.filter(s => s.status !== 'cancelled')

  return (
    <div className="px-3 pb-2.5">
      {/* Hour labels */}
      <div className="relative flex justify-between text-[9px] text-slate-500 mb-0.5 px-0.5">
        <span>8am</span><span>10</span><span>noon</span><span>2pm</span><span>4pm</span>
      </div>

      {/* Timeline track */}
      <div className="relative h-5 rounded bg-[#1a2537] overflow-hidden">
        {/* Hour grid lines */}
        {[9,10,11,12,13,14,15].map(h => (
          <div key={h} className="absolute top-0 bottom-0 w-px bg-[#2d3f55]"
            style={{ left: pct(h * 60) }} />
        ))}

        {/* Drive segments */}
        {active.map((stop, i) => {
          const driveFrom = i === 0 ? DAY_START : active[i - 1].endMin
          const driveTo   = stop.arrivalMin
          if (driveTo <= driveFrom) return null
          return (
            <div key={`d${i}`} className="absolute top-0 h-full"
              style={{ left: pct(driveFrom), width: wPct(driveFrom, driveTo), background: DRIVE_BG[stop.drive.traffic] }} />
          )
        })}

        {/* Job blocks */}
        {active.map(stop => (
          <div key={stop.job.id}
            className="absolute top-0.5 bottom-0.5 rounded-sm"
            style={{ left: pct(stop.startMin), width: wPct(stop.startMin, stop.endMin), background: color }}
            title={`${stop.startTime} · ${stop.job.address.split(',')[0]} · ${stop.job.estimatedDuration} min`}
          />
        ))}

        {/* Wait gaps (lighter overlay) */}
        {active.map((stop) => stop.waitMin > 0 ? (
          <div key={`w${stop.job.id}`}
            className="absolute top-0 h-full bg-slate-600/20"
            style={{ left: pct(stop.arrivalMin), width: wPct(stop.arrivalMin, stop.startMin) }}
            title={`${stop.waitMin} min wait`}
          />
        ) : null)}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex items-center gap-1">
          <div className="h-2 w-3 rounded-sm" style={{ background: color }} />
          <span className="text-[9px] text-slate-600">Job</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-3 rounded-sm bg-emerald-500/30" />
          <span className="text-[9px] text-slate-600">Drive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-3 rounded-sm bg-red-500/35" />
          <span className="text-[9px] text-slate-600">Heavy</span>
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
    <div className="mt-1.5 rounded-lg border border-indigo-500/20 bg-[#0d1321] p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-400">Notify client</p>
        <button onClick={onClose}><X className="h-3 w-3 text-slate-600 hover:text-slate-400" /></button>
      </div>
      <div className="flex flex-wrap gap-1">
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => { setTpl(t.id); setText(buildMsg(t.id, stop, teamName)) }}
            className={cn('rounded px-1.5 py-0.5 text-[9px] font-medium border transition-colors',
              tpl === t.id ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                           : 'border-[#1e2a3a] text-slate-600 hover:text-slate-400'
            )}>{t.label}</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        className="w-full resize-none rounded border border-[#1e2a3a] bg-[#111827] px-2 py-1 text-[10px] text-slate-300 leading-relaxed focus:outline-none focus:border-indigo-500/40" />
      <button onClick={() => { setSent(true); setTimeout(onClose, 1000) }} disabled={sent}
        className={cn('w-full flex items-center justify-center gap-1 rounded py-1 text-[10px] font-semibold transition-all',
          sent ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
               : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
        )}>
        {sent ? <><CheckCircle className="h-3 w-3" /> Sent!</> : <><Send className="h-3 w-3" /> Send SMS</>}
      </button>
    </div>
  )
}

// ─── Stop row ─────────────────────────────────────────────────────────────────
function StopRow({ stop, teamColor, teamName, onCancel, onFlyTo }: {
  stop: RouteStop; teamColor: string; teamName: string
  onCancel: () => void; onFlyTo: () => void
}) {
  const [msgOpen, setMsgOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)

  if (stop.status === 'cancelled') return (
    <div className="flex items-center gap-2 py-1.5 px-1 opacity-40">
      <div className="h-5 w-5 rounded-full bg-[#1e2a3a] flex items-center justify-center text-[9px] text-slate-600 font-bold flex-shrink-0">×</div>
      <span className="text-[10px] text-slate-600 line-through truncate">{stop.job.address.split(',')[0]}</span>
    </div>
  )

  return (
    <div className="rounded-lg border border-[#1e2a3a] bg-[#0d1321] overflow-hidden">
      <div className="flex items-start gap-2 p-2">
        {/* Sequence — fly-to */}
        <button onClick={onFlyTo}
          className="mt-0.5 flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-transform hover:scale-110"
          style={{ background: teamColor }}>
          {stop.status === 'complete' ? '✓' : stop.sequence}
        </button>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-200 truncate">{stop.job.address.split(',')[0]}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{stop.startTime}
            </span>
            <span className="text-[9px] text-slate-700">·</span>
            <span className="text-[10px] text-slate-500">{stop.job.estimatedDuration}min</span>
            <span className="text-[9px] text-slate-700">·</span>
            <span className="text-[10px] text-slate-500">{SERVICE_LABEL[stop.job.serviceType] ?? stop.job.serviceType}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-[10px] font-medium', TRAFFIC_TEXT[stop.drive.traffic])}>
              {stop.drive.minutes}min drive
            </span>
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full flex-shrink-0', TRAFFIC_DOT[stop.drive.traffic])} />
            <span className="text-[10px] text-emerald-500 font-semibold ml-auto">${stop.job.price}</span>
          </div>
          {stop.waitMin > 5 && (
            <p className="text-[9px] text-amber-600 mt-0.5">{stop.waitMin}min wait before start</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
          <button onClick={() => { setMsgOpen(v => !v); setConfirm(false) }}
            className={cn('h-6 w-6 flex items-center justify-center rounded border transition-colors',
              msgOpen ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-400'
                      : 'border-[#1e2a3a] text-slate-600 hover:text-indigo-400'
            )}><MessageSquare className="h-2.5 w-2.5" /></button>

          {stop.status !== 'complete' && (
            confirm
              ? <button onClick={() => { setConfirm(false); onCancel() }}
                  className="h-6 w-6 flex items-center justify-center rounded border border-red-500/40 bg-red-500/15 text-red-400 transition-colors">
                  <AlertTriangle className="h-2.5 w-2.5" /></button>
              : <button onClick={() => setConfirm(true)}
                  className="h-6 w-6 flex items-center justify-center rounded border border-[#1e2a3a] text-slate-600 hover:text-red-400 hover:border-red-500/20 transition-colors">
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
function TeamCard({ route, onCancel, onFlyTo }: {
  route: TeamRoute
  onCancel: (jobId: string) => void
  onFlyTo: (lat: number, lng: number) => void
}) {
  const [open, setOpen] = useState(false)
  const active = route.stops.filter(s => s.status !== 'cancelled')
  const revenue = active.reduce((s, x) => s + x.job.price, 0)
  const slots = findRescheduleSlots(route.stops)
  const teamName = route.cleanerNames.join(' & ')

  return (
    <div className="rounded-xl border border-[#1e2a3a] overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-2.5 p-3 bg-[#111827] hover:bg-[#162032] transition-colors text-left">
        <div className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: route.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{teamName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-500">{active.length} stops</span>
            <span className="text-[9px] text-slate-700">·</span>
            <span className="text-[10px] text-slate-500">{route.totalDriveMin}min drive</span>
            <span className="text-[9px] text-slate-700">·</span>
            <span className="text-[10px] text-slate-500">{route.totalKm}km</span>
            <span className="text-[9px] text-slate-700">·</span>
            <span className="text-[10px] font-semibold text-emerald-500">${revenue}</span>
            <span className="ml-auto text-[10px] text-slate-600">{route.efficiency}% util</span>
          </div>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
               : <ChevronDown className="h-3.5 w-3.5 text-slate-600 flex-shrink-0 mt-0.5" />}
      </button>

      {/* Timeline always visible */}
      <TimelineBar stops={route.stops} color={route.color} />

      {/* Expanded stops */}
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-[#1e2a3a] pt-2.5">
          {route.stops.map(stop => (
            <StopRow key={stop.job.id} stop={stop}
              teamColor={route.color} teamName={teamName}
              onCancel={() => onCancel(stop.job.id)}
              onFlyTo={() => onFlyTo(stop.job.lat, stop.job.lng)}
            />
          ))}

          {slots.length > 0 && (
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <RotateCcw className="h-3 w-3 text-emerald-400" />
                <p className="text-[10px] font-semibold text-emerald-400">Available windows</p>
              </div>
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px] text-slate-400">{slot.windowStart} – {slot.windowEnd}</span>
                  <span className="text-[10px] font-semibold text-emerald-500">{slot.gapMin}min open</span>
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
  onRefreshRoutes: (overrides: Record<string, RouteStop['status']>) => void
  gpsTracking: boolean
  trackedCleaner: string | null
  onStartGPS: (cleanerId: string | null) => void
  onStopGPS: () => void
  onFlyTo: (lat: number, lng: number) => void
}

// ─── RoutingPanel ─────────────────────────────────────────────────────────────
export function RoutingPanel({
  routes, cleaners, onRefreshRoutes,
  gpsTracking, trackedCleaner, onStartGPS, onStopGPS, onFlyTo,
}: Props) {
  const [overrides, setOverrides] = useState<Record<string, RouteStop['status']>>({})

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const totalJobs = routes.reduce((s, r) => s + r.stops.filter(x => x.status !== 'cancelled').length, 0)
  const totalKm   = routes.reduce((s, r) => s + r.totalKm, 0)
  const totalRev  = routes.reduce((s, r) => s + r.stops.filter(x => x.status !== 'cancelled').reduce((a, x) => a + x.job.price, 0), 0)

  function handleCancel(jobId: string) {
    const next = { ...overrides, [jobId]: 'cancelled' as const }
    setOverrides(next)
    onRefreshRoutes(next)
  }

  return (
    <div className="flex w-72 flex-col overflow-hidden border-r border-[#1e2a3a] bg-[#0a0f1c]">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Dispatch</h2>
          <span className="text-xs text-slate-500">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-300">{routes.length}</span>
            <span className="text-[10px] text-slate-600">teams</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-300">{totalJobs}</span>
            <span className="text-[10px] text-slate-600">jobs</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-emerald-400">${totalRev}</span>
            <span className="text-[10px] text-slate-600">est.</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-300">{totalKm.toFixed(0)}</span>
            <span className="text-[10px] text-slate-600">km</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 mt-1">8:00 AM – 4:00 PM · 5 teams of 2</p>
      </div>

      {/* GPS control */}
      <div className="border-b border-[#1e2a3a] p-3">
        {gpsTracking ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="gps-dot inline-block h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-[11px] font-medium text-blue-300">
                  {trackedCleaner ? `Tracking ${cleaners.find(c => c.id === trackedCleaner)?.name.split(' ')[0]}` : 'GPS Active'}
                </span>
              </div>
              <button onClick={onStopGPS}
                className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20 transition-colors">
                <WifiOff className="h-2.5 w-2.5" /> Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <button onClick={() => onStartGPS(null)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors">
              <Wifi className="h-3 w-3" /> Start GPS (this device)
            </button>
            <div className="grid grid-cols-2 gap-1">
              {cleaners.map(c => (
                <button key={c.id} onClick={() => onStartGPS(c.id)}
                  className="flex items-center gap-1.5 rounded border border-[#1e2a3a] px-2 py-1 text-[9px] font-medium text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors truncate">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <MapPin className="h-8 w-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-600">No routes for today</p>
            <p className="text-[10px] text-slate-700 mt-1">Jobs scheduled for today will appear here</p>
          </div>
        ) : (
          routes.map(route => (
            <TeamCard key={route.teamId} route={route} onCancel={handleCancel} onFlyTo={onFlyTo} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e2a3a] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            <DollarSign className="h-2.5 w-2.5" />
            <span>Tap ① to fly to stop · 💬 to notify client · × to cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
