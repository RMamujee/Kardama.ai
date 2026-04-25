'use client'
import { useState } from 'react'
import { Cleaner } from '@/types'
import { TeamRoute, RouteStop, findRescheduleSlots } from '@/lib/routing-engine'
import { cn } from '@/lib/utils'
import {
  Navigation, WifiOff, Wifi, Clock, MapPin, ChevronDown, ChevronUp,
  MessageSquare, X, AlertTriangle, RotateCcw, Send, CheckCircle,
} from 'lucide-react'

// ─── Notification templates ────────────────────────────────────────────────────
type MsgTemplate = 'on-way' | 'almost' | 'arrived' | 'complete'

function buildMsg(template: MsgTemplate, stop: RouteStop, teamName: string): string {
  const addr = stop.job.address.split(',')[0]
  const eta  = stop.startTime
  switch (template) {
    case 'on-way':  return `Hi! ${teamName} is on the way to ${addr}. Estimated arrival: ${eta}. Reply STOP to cancel.`
    case 'almost':  return `Hi! ${teamName} is about 10 minutes away from ${addr}. Please ensure access is ready!`
    case 'arrived': return `${teamName} has arrived at ${addr} and is starting your service. We'll notify you when complete.`
    case 'complete': return `Your cleaning at ${addr} is complete! Thank you for choosing Kardama. Have a great day! ✨`
  }
}

const TEMPLATES: { id: MsgTemplate; label: string; color: string }[] = [
  { id: 'on-way',   label: 'On the Way',  color: 'text-indigo-400' },
  { id: 'almost',   label: '~10 min away', color: 'text-yellow-400' },
  { id: 'arrived',  label: 'Arrived',     color: 'text-emerald-400' },
  { id: 'complete', label: 'Complete',    color: 'text-slate-400'   },
]

const TRAFFIC_COLORS: Record<string, string> = {
  clear: 'text-emerald-400',
  moderate: 'text-yellow-400',
  heavy: 'text-red-400',
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

// ─── Per-stop message composer ─────────────────────────────────────────────────
function MsgComposer({ stop, teamName, onClose }: { stop: RouteStop; teamName: string; onClose: () => void }) {
  const [selected, setSelected] = useState<MsgTemplate>('on-way')
  const [text, setText] = useState(() => buildMsg('on-way', stop, teamName))
  const [sent, setSent] = useState(false)

  function pickTemplate(t: MsgTemplate) {
    setSelected(t)
    setText(buildMsg(t, stop, teamName))
  }

  function send() {
    setSent(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="mt-2 rounded-xl border border-indigo-500/20 bg-[#0d1321] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-300">Notify {stop.job.address.split(',')[0]}</p>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400"><X className="h-3.5 w-3.5" /></button>
      </div>

      {/* Template chips */}
      <div className="flex flex-wrap gap-1">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => pickTemplate(t.id)}
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-medium border transition-colors',
              selected === t.id
                ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                : 'border-[#1e2a3a] bg-transparent text-slate-500 hover:text-slate-300'
            )}
          >{t.label}</button>
        ))}
      </div>

      {/* Editable message */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-[#1e2a3a] bg-[#111827] px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/40 leading-relaxed"
      />

      <button
        onClick={send}
        disabled={sent}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all',
          sent
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default'
            : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25'
        )}
      >
        {sent ? <><CheckCircle className="h-3.5 w-3.5" /> Sent!</> : <><Send className="h-3.5 w-3.5" /> Send SMS</>}
      </button>
    </div>
  )
}

// ─── Single stop row ──────────────────────────────────────────────────────────
function StopRow({
  stop, teamColor, teamName, onCancel, onFlyTo,
}: {
  stop: RouteStop
  teamColor: string
  teamName: string
  onCancel: () => void
  onFlyTo: () => void
}) {
  const [msgOpen, setMsgOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (stop.status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#1e2a3a] bg-[#0d1321]/50 p-2 opacity-50">
        <div className="h-6 w-6 flex-shrink-0 rounded-full bg-[#1e2a3a] flex items-center justify-center text-[10px] text-slate-600 font-bold">×</div>
        <p className="text-[11px] text-slate-600 line-through truncate">{stop.job.address.split(',')[0]}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#1e2a3a] bg-[#0d1321] overflow-hidden hover:border-indigo-500/20 transition-colors">
      <div className="flex items-start gap-2.5 p-2.5">
        {/* Sequence bubble */}
        <button
          onClick={onFlyTo}
          className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center font-bold text-[12px] text-white transition-transform hover:scale-110"
          style={{ background: teamColor }}
          title="Fly to on map"
        >
          {stop.status === 'complete' ? '✓' : stop.sequence}
        </button>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-slate-200 truncate">{stop.job.address.split(',')[0]}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{stop.startTime}
            </span>
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-slate-500">{stop.job.estimatedDuration} min</span>
            {stop.waitMin > 0 && (
              <span className="text-[10px] text-yellow-600">{stop.waitMin} min wait</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn('text-[10px] font-medium', TRAFFIC_COLORS[stop.drive.traffic])}>
              {stop.drive.minutes} min drive
            </span>
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-slate-600 capitalize">{stop.drive.traffic}</span>
            <span className="text-[10px] text-slate-700">· {stop.drive.km.toFixed(1)} km</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setMsgOpen(v => !v); setConfirming(false) }}
            title="Send client notification"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors',
              msgOpen
                ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-400'
                : 'border-[#1e2a3a] text-slate-600 hover:text-indigo-400 hover:border-indigo-500/20'
            )}
          ><MessageSquare className="h-3 w-3" /></button>

          {stop.status !== 'complete' && (
            confirming ? (
              <button
                onClick={() => { setConfirming(false); onCancel() }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                title="Confirm cancel"
              ><AlertTriangle className="h-3 w-3" /></button>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1e2a3a] text-slate-600 hover:text-red-400 hover:border-red-500/20 transition-colors"
                title="Cancel this stop"
              ><X className="h-3 w-3" /></button>
            )
          )}
        </div>
      </div>

      {msgOpen && (
        <div className="px-2.5 pb-2.5">
          <MsgComposer stop={stop} teamName={teamName} onClose={() => setMsgOpen(false)} />
        </div>
      )}
    </div>
  )
}

// ─── Per-team card ─────────────────────────────────────────────────────────────
function TeamCard({
  route, onCancel, onFlyTo,
}: {
  route: TeamRoute
  onCancel: (jobId: string) => void
  onFlyTo: (lat: number, lng: number) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const teamName = route.cleanerNames.join(' & ')
  const reschedSlots = findRescheduleSlots(route.stops)

  return (
    <div className="rounded-xl border border-[#1e2a3a] overflow-hidden">
      {/* Team header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-2.5 p-3 bg-[#111827] hover:bg-[#162032] transition-colors"
      >
        {/* Color swatch */}
        <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: route.color }} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-slate-200 truncate">{teamName}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {route.stops.filter(s => s.status !== 'cancelled').length} stops · {route.totalDriveMin} min drive · {route.efficiency}% eff
          </p>
        </div>
        {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" /> : <ChevronUp className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />}
      </button>

      {!collapsed && (
        <div className="p-2.5 space-y-2">
          {route.stops.map(stop => (
            <StopRow
              key={stop.job.id}
              stop={stop}
              teamColor={route.color}
              teamName={teamName}
              onCancel={() => onCancel(stop.job.id)}
              onFlyTo={() => onFlyTo(stop.job.lat, stop.job.lng)}
            />
          ))}

          {/* Reschedule slots */}
          {reschedSlots.length > 0 && (
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <RotateCcw className="h-3 w-3 text-emerald-400" />
                <p className="text-[10px] font-semibold text-emerald-400">Open Windows</p>
              </div>
              {reschedSlots.map((slot, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-slate-400">{slot.windowStart} – {slot.windowEnd}</span>
                  <span className="text-emerald-500 font-medium">{slot.gapMin} min free</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── RoutingPanel ─────────────────────────────────────────────────────────────
export function RoutingPanel({
  routes, cleaners, onRefreshRoutes,
  gpsTracking, trackedCleaner, onStartGPS, onStopGPS, onFlyTo,
}: Props) {
  const [overrides, setOverrides] = useState<Record<string, RouteStop['status']>>({})

  function handleCancel(jobId: string) {
    const next = { ...overrides, [jobId]: 'cancelled' as const }
    setOverrides(next)
    onRefreshRoutes(next)
  }

  const totalStops   = routes.reduce((s, r) => s + r.stops.filter(x => x.status !== 'cancelled').length, 0)
  const totalDriveKm = routes.reduce((s, r) => s + r.totalKm, 0)

  return (
    <div className="flex w-72 flex-col overflow-hidden border-r border-[#1e2a3a] bg-[#0a0f1c]">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Route Planner</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {routes.length} team{routes.length !== 1 ? 's' : ''} · {totalStops} stops · {totalDriveKm.toFixed(1)} km
        </p>
      </div>

      {/* GPS control */}
      <div className="border-b border-[#1e2a3a] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">GPS Tracking</span>
          </div>
          {gpsTracking && (
            <div className="flex items-center gap-1">
              <span className="gps-dot inline-block h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-blue-400 font-medium">Live</span>
            </div>
          )}
        </div>

        {gpsTracking ? (
          <div className="space-y-1.5">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5">
              <p className="text-[11px] font-medium text-blue-300">
                {trackedCleaner
                  ? `Tracking ${cleaners.find(c => c.id === trackedCleaner)?.name.split(' ')[0] ?? 'cleaner'}`
                  : 'Device GPS active'}
              </p>
            </div>
            <button
              onClick={onStopGPS}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <WifiOff className="h-3 w-3" /> Stop Tracking
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => onStartGPS(null)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            >
              <Wifi className="h-3 w-3" /> Start GPS (this device)
            </button>

            {/* Per-cleaner GPS assign */}
            {cleaners.length > 0 && (
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                {cleaners.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onStartGPS(c.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#1e2a3a] px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors truncate"
                  >
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    {c.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Route cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <MapPin className="h-8 w-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-600">No routes for today</p>
            <p className="text-[10px] text-slate-700 mt-1">Jobs will appear when scheduled for today</p>
          </div>
        ) : (
          routes.map(route => (
            <TeamCard
              key={route.teamId}
              route={route}
              onCancel={handleCancel}
              onFlyTo={onFlyTo}
            />
          ))
        )}
      </div>
    </div>
  )
}
