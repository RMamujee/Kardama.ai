'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Clock, MapPin, CheckCircle2, Zap, Navigation,
  Bell, Car, MessageSquare, Phone, Timer, AlertTriangle,
  ChevronRight, CheckCheck, RefreshCw
} from 'lucide-react'
import { cn, formatCurrency, getServiceLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JOBS, CUSTOMERS, CLEANERS } from '@/lib/mock-data'
import { Job, Customer, Cleaner } from '@/types'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function driveMin(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  return Math.round((haversineKm(fromLat, fromLng, toLat, toLng) / 30) * 60 + 5)
}

function parseMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minToTime(minutes: number): string {
  const totalMin = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

interface EnrichedJob {
  job: Job
  customer: Customer | undefined
  cleaners: Cleaner[]
  teamId: string
  etaMinutes: number
  etaTime: string
  prevJobEnd: number | null
  driveFromPrev: number | null
  isOnSchedule: boolean
}

function useJobSchedule(): EnrichedJob[] {
  const todayStr = new Date().toISOString().split('T')[0]
  const todayJobs = JOBS
    .filter(j => j.scheduledDate === todayStr)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

  // Group by team
  const byTeam: Record<string, Job[]> = {}
  for (const job of todayJobs) {
    const cleaner = CLEANERS.find(c => c.id === job.cleanerIds[0])
    const teamId = cleaner?.teamId || 'unknown'
    if (!byTeam[teamId]) byTeam[teamId] = []
    byTeam[teamId].push(job)
  }

  const enriched: EnrichedJob[] = []

  for (const [teamId, jobs] of Object.entries(byTeam)) {
    let prevEndMin: number | null = null
    let prevLat: number | null = null
    let prevLng: number | null = null

    for (const job of jobs) {
      const scheduledMin = parseMin(job.scheduledTime)
      let etaMinutes = scheduledMin
      let driveFromPrev: number | null = null
      let isOnSchedule = true

      if (prevEndMin !== null && prevLat !== null && prevLng !== null) {
        driveFromPrev = driveMin(prevLat, prevLng, job.lat, job.lng)
        const earliestArrival = prevEndMin + driveFromPrev
        if (earliestArrival > scheduledMin) {
          etaMinutes = earliestArrival
          isOnSchedule = false
        } else {
          etaMinutes = scheduledMin
        }
      }

      enriched.push({
        job,
        customer: CUSTOMERS.find(c => c.id === job.customerId),
        cleaners: job.cleanerIds.map(id => CLEANERS.find(c => c.id === id)!).filter(Boolean),
        teamId,
        etaMinutes,
        etaTime: minToTime(etaMinutes),
        prevJobEnd: prevEndMin,
        driveFromPrev,
        isOnSchedule,
      })

      prevEndMin = scheduledMin + job.estimatedDuration
      prevLat = job.lat
      prevLng = job.lng
    }
  }

  return enriched.sort((a, b) => a.etaMinutes - b.etaMinutes)
}

type TemplateKey = 'on-way' | 'running-late' | 'arrived' | 'complete'

const TEMPLATES: Record<TemplateKey, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  'on-way':       { label: 'On the Way', icon: Car,          color: 'text-indigo-400' },
  'running-late': { label: 'Running Late', icon: AlertTriangle, color: 'text-amber-400' },
  'arrived':      { label: "We're Here",  icon: CheckCircle2, color: 'text-emerald-400' },
  'complete':     { label: 'Job Done',    icon: CheckCheck,   color: 'text-teal-400' },
}

function buildMessage(template: TemplateKey, item: EnrichedJob): string {
  const name = item.customer?.name.split(' ')[0] || 'there'
  const address = item.customer?.address?.split(',')[0] || 'your location'
  const team = item.cleaners.map(c => c.name.split(' ')[0]).join(' & ')
  const price = formatCurrency(item.job.price)

  switch (template) {
    case 'on-way':
      return `Hi ${name}! Your David's Cleaning team (${team}) is on their way to you now 🚗 Estimated arrival: ${item.etaTime}. Please make sure we can access ${address}. Reply anytime if you have questions!`
    case 'running-late':
      const delay = item.isOnSchedule ? 15 : item.etaMinutes - parseMin(item.job.scheduledTime)
      return `Hi ${name}! Quick update — your team is running about ${delay} minutes behind schedule. New estimated arrival: ${item.etaTime}. We apologize for the delay and appreciate your patience! 🙏`
    case 'arrived':
      return `Hi ${name}! Your cleaning team just arrived at ${address} ✅ We'll get started right away. Estimated completion: ${minToTime(parseMin(item.job.scheduledTime) + item.job.estimatedDuration)}. Thank you for choosing David's Cleaning!`
    case 'complete':
      return `Hi ${name}! Your home is sparkling clean 🌟 Our team just finished at ${address}. Total: ${price}. Please send payment via Zelle/Venmo at your convenience. Thank you — see you next time! 🏠`
  }
}

const SERVICE_COLORS: Record<string, string> = {
  standard: 'bg-indigo-500/20 text-indigo-300',
  deep: 'bg-violet-500/20 text-violet-300',
  'move-out': 'bg-amber-500/20 text-amber-300',
  airbnb: 'bg-teal-500/20 text-teal-300',
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'neutral'> = {
  scheduled: 'default', confirmed: 'success', 'in-progress': 'warning', completed: 'neutral',
}

export default function MessagesPage() {
  const schedule = useJobSchedule()
  const [selected, setSelected] = useState<EnrichedJob | null>(schedule[0] || null)
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('on-way')
  const [message, setMessage] = useState(() =>
    schedule[0] ? buildMessage('on-way', schedule[0]) : ''
  )
  const [sentSet, setSentSet] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  function selectJob(item: EnrichedJob) {
    setSelected(item)
    setMessage(buildMessage(activeTemplate, item))
  }

  function selectTemplate(t: TemplateKey) {
    setActiveTemplate(t)
    if (selected) setMessage(buildMessage(t, selected))
  }

  async function handleSend() {
    if (!selected || !message.trim() || !selected.customer?.phone) return
    setSending(true)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selected.customer.phone,
          body: message,
          jobId: selected.job.id,
          customerId: selected.customer.id,
          template: activeTemplate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setSentSet(prev => new Set(prev).add(`${selected.job.id}-${activeTemplate}`))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to send SMS: ${msg}`)
    } finally {
      setSending(false)
    }
  }

  const sentKey = selected ? `${selected.job.id}-${activeTemplate}` : ''
  const isSent = sentSet.has(sentKey)

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left: Schedule timeline */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-[#1e2a3a] bg-[#0a0f1c]">
        <div className="p-4 border-b border-[#1e2a3a]">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Today's Routes</h2>
            <span className="ml-auto text-[10px] text-slate-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Select a job to compose a client notification</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {schedule.length === 0 && (
            <div className="p-6 text-center">
              <Timer className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No jobs scheduled today</p>
            </div>
          )}

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[2.15rem] top-4 bottom-4 w-px bg-[#1e2a3a]" />

            {schedule.map((item, idx) => {
              const isActive = selected?.job.id === item.job.id
              const hasSent = [...sentSet].some(k => k.startsWith(item.job.id))

              return (
                <button
                  key={item.job.id}
                  onClick={() => selectJob(item)}
                  className={cn(
                    'relative w-full flex items-start gap-3 px-3 py-3 text-left transition-colors',
                    isActive ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]',
                    idx < schedule.length - 1 && 'border-b border-[#1e2a3a]/50'
                  )}
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'relative z-10 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    item.job.status === 'in-progress'
                      ? 'border-amber-500 bg-amber-500/20'
                      : item.job.status === 'completed'
                      ? 'border-emerald-500 bg-emerald-500/20'
                      : isActive
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-[#2a3a4a] bg-[#111827]'
                  )}>
                    {item.job.status === 'in-progress' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {item.job.status === 'completed' && (
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    )}
                    {(item.job.status === 'scheduled' || item.job.status === 'confirmed') && isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {item.customer?.name || 'Unknown'}
                      </span>
                      <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                        {hasSent && <CheckCheck className="h-3 w-3 text-emerald-400" />}
                        {!item.isOnSchedule && (
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="h-2.5 w-2.5 text-slate-600" />
                      <span className="text-[10px] text-slate-500">{item.etaTime}</span>
                      {!item.isOnSchedule && (
                        <span className="text-[10px] text-amber-400">delayed</span>
                      )}
                      <span className={cn(
                        'rounded px-1 py-0.5 text-[9px] font-medium',
                        SERVICE_COLORS[item.job.serviceType] || 'bg-slate-500/20 text-slate-300'
                      )}>
                        {getServiceLabel(item.job.serviceType)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-slate-600 flex-shrink-0" />
                      <span className="text-[10px] text-slate-600 truncate">
                        {item.customer?.address?.split(',')[0]}
                      </span>
                    </div>
                    {item.driveFromPrev !== null && (
                      <div className="mt-1 flex items-center gap-1">
                        <Car className="h-2.5 w-2.5 text-slate-700" />
                        <span className="text-[10px] text-slate-700">{item.driveFromPrev}min drive from prev</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Notification Composer */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.job.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              {/* Customer header */}
              <div className="px-6 py-4 border-b border-[#1e2a3a] bg-[#0a0f1c]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                        {selected.customer?.name?.split(' ').map(n => n[0]).join('') || '??'}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{selected.customer?.name || 'Unknown Customer'}</h3>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-500">{selected.customer?.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_BADGE[selected.job.status] || 'default'} className="capitalize">
                        {selected.job.status}
                      </Badge>
                      <span className="text-[11px] text-slate-500">
                        {getServiceLabel(selected.job.serviceType)} · {selected.job.estimatedDuration} min
                      </span>
                      <span className="text-[11px] text-slate-500">·</span>
                      <span className="text-[11px] font-medium text-emerald-400">{formatCurrency(selected.job.price)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{selected.etaTime}</div>
                    <div className="text-[11px] text-slate-500">
                      {selected.isOnSchedule ? 'on schedule' : 'running late'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ETA Breakdown */}
              <div className="px-6 py-4 border-b border-[#1e2a3a]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-3">ETA Breakdown</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {selected.prevJobEnd !== null ? (
                    <>
                      <div className="flex items-center gap-1.5 rounded-lg bg-[#1a2537] px-3 py-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <div>
                          <div className="text-[10px] text-slate-500">Prev job ends</div>
                          <div className="text-xs font-semibold text-white">{minToTime(selected.prevJobEnd)}</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-700" />
                      <div className="flex items-center gap-1.5 rounded-lg bg-[#1a2537] px-3 py-2">
                        <Car className="h-3.5 w-3.5 text-indigo-400" />
                        <div>
                          <div className="text-[10px] text-slate-500">Drive time</div>
                          <div className="text-xs font-semibold text-white">{selected.driveFromPrev} min</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-700" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 rounded-lg bg-[#1a2537] px-3 py-2">
                        <Timer className="h-3.5 w-3.5 text-indigo-400" />
                        <div>
                          <div className="text-[10px] text-slate-500">First job of day</div>
                          <div className="text-xs font-semibold text-white">Starting fresh</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-700" />
                    </>
                  )}
                  <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
                    <Navigation className="h-3.5 w-3.5 text-indigo-400" />
                    <div>
                      <div className="text-[10px] text-indigo-400">Arrives at</div>
                      <div className="text-xs font-bold text-white">{selected.etaTime}</div>
                    </div>
                  </div>
                  {!selected.isOnSchedule && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      <div>
                        <div className="text-[10px] text-amber-400">Delay</div>
                        <div className="text-xs font-bold text-white">
                          +{selected.etaMinutes - parseMin(selected.job.scheduledTime)} min
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Team pills */}
              <div className="px-6 py-3 border-b border-[#1e2a3a]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Team</span>
                  {selected.cleaners.map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 rounded-full bg-[#1a2537] pl-1.5 pr-2.5 py-1">
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ background: c.color }}
                      >
                        {c.initials}
                      </div>
                      <span className="text-[11px] text-slate-300">{c.name.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template selector */}
              <div className="px-6 py-4 border-b border-[#1e2a3a]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Notification Type</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tmpl]) => (
                    <button
                      key={key}
                      onClick={() => selectTemplate(key)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                        activeTemplate === key
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                          : 'border-[#1e2a3a] text-slate-500 hover:border-slate-600 hover:text-slate-300'
                      )}
                    >
                      <tmpl.icon className={cn('h-3.5 w-3.5', activeTemplate === key ? 'text-indigo-400' : 'text-slate-600')} />
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message editor */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Message Preview</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <MessageSquare className="h-3 w-3" />
                    SMS · {message.length} chars
                  </div>
                </div>

                {/* Phone mockup */}
                <div className="mx-auto max-w-sm">
                  <div className="rounded-2xl border border-[#1e2a3a] bg-[#0d1321] p-4">
                    {/* SMS header */}
                    <div className="mb-3 flex items-center gap-2 border-b border-[#1e2a3a] pb-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
                        DC
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">David's Cleaning</div>
                        <div className="text-[10px] text-slate-500">SMS Notification</div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#1a2537] p-3 text-sm text-slate-200 leading-relaxed">
                      {message}
                    </div>
                  </div>
                </div>

                {/* Editable textarea */}
                <div className="mt-4">
                  <p className="text-[10px] text-slate-600 mb-1.5">Edit message</p>
                  <textarea
                    className="w-full resize-none rounded-xl bg-[#111827] border border-[#1e2a3a] px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>
              </div>

              {/* Send bar */}
              <div className="px-6 py-4 border-t border-[#1e2a3a] bg-[#0a0f1c]">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-300">
                      Send to: {selected.customer?.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{selected.customer?.phone}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(buildMessage(activeTemplate, selected))}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sending || isSent}
                    size="sm"
                    className={cn('h-8 gap-2 min-w-[120px]', isSent && 'bg-emerald-600 hover:bg-emerald-600')}
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : isSent ? (
                      <>
                        <CheckCheck className="h-3.5 w-3.5" />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-1 items-center justify-center flex-col gap-3 text-center">
            <Bell className="h-10 w-10 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">No jobs today</p>
            <p className="text-xs text-slate-600">Add jobs to the schedule to send arrival notifications</p>
          </div>
        )}
      </div>

      {/* Right sidebar: send log */}
      <div className="w-52 flex-shrink-0 border-l border-[#1e2a3a] bg-[#0a0f1c] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-3">Sent Today</p>

        {sentSet.size === 0 ? (
          <div className="py-4 text-center">
            <Send className="h-6 w-6 text-slate-700 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600">No messages sent yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...sentSet].map(key => {
              const [jobId, tpl] = key.split('-') as [string, TemplateKey]
              const item = schedule.find(s => s.job.id === jobId)
              if (!item) return null
              return (
                <div key={key} className="rounded-lg bg-[#111827] border border-[#1e2a3a] p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCheck className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-medium text-emerald-400">Sent</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-300 truncate">{item.customer?.name}</p>
                  <p className="text-[10px] text-slate-600">{TEMPLATES[tpl]?.label}</p>
                  <p className="text-[10px] text-slate-600">{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 border-t border-[#1e2a3a] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Today's Stats</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Jobs</span>
              <span className="text-[11px] font-semibold text-white">{schedule.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Notified</span>
              <span className="text-[11px] font-semibold text-emerald-400">{new Set([...sentSet].map(k => k.split('-')[0])).size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Revenue</span>
              <span className="text-[11px] font-semibold text-white">
                {formatCurrency(schedule.reduce((s, i) => s + i.job.price, 0))}
              </span>
            </div>
            {schedule.some(s => !s.isOnSchedule) && (
              <div className="flex items-center gap-1 mt-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                <span className="text-[10px] text-amber-400">Delays detected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
