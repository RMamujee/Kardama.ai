'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Clock, MapPin, CheckCircle2, Navigation,
  Bell, Car, MessageSquare, Phone, Timer, AlertTriangle,
  ChevronRight, CheckCheck, RefreshCw
} from 'lucide-react'
import { cn, formatCurrency, getServiceLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Job, Customer, Cleaner } from '@/types'

type MessagesData = {
  jobs: Job[]
  customers: Customer[]
  cleaners: Cleaner[]
}

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

function buildJobSchedule(jobs: Job[], customers: Customer[], cleaners: Cleaner[]): EnrichedJob[] {
  const todayStr = new Date().toISOString().split('T')[0]
  const todayJobs = jobs
    .filter(j => j.scheduledDate === todayStr)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

  // Group by team
  const byTeam: Record<string, Job[]> = {}
  for (const job of todayJobs) {
    const cleaner = cleaners.find(c => c.id === job.cleanerIds[0])
    const teamId = cleaner?.teamId || 'unknown'
    if (!byTeam[teamId]) byTeam[teamId] = []
    byTeam[teamId].push(job)
  }

  const enriched: EnrichedJob[] = []

  for (const [teamId, teamJobs] of Object.entries(byTeam)) {
    let prevEndMin: number | null = null
    let prevLat: number | null = null
    let prevLng: number | null = null

    for (const job of teamJobs) {
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
        customer: customers.find(c => c.id === job.customerId),
        cleaners: job.cleanerIds.map(id => cleaners.find(c => c.id === id)!).filter(Boolean),
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
  'on-way':       { label: 'On the Way',    icon: Car,            color: 'text-violet-400' },
  'running-late': { label: 'Running Late',  icon: AlertTriangle,  color: 'text-amber-500' },
  'arrived':      { label: "We're Here",    icon: CheckCircle2,   color: 'text-emerald-500' },
  'complete':     { label: 'Job Done',      icon: CheckCheck,     color: 'text-teal-500' },
}

function buildMessage(template: TemplateKey, item: EnrichedJob): string {
  const name = item.customer?.name.split(' ')[0] || 'there'
  const address = item.customer?.address?.split(',')[0] || 'your location'
  const team = item.cleaners.map(c => c.name.split(' ')[0]).join(' & ')
  const price = formatCurrency(item.job.price)

  switch (template) {
    case 'on-way':
      return `Hi ${name}! Your David's Cleaning team (${team}) is on their way to you now 🚗 Estimated arrival: ${item.etaTime}. Please make sure we can access ${address}. Reply anytime if you have questions!`
    case 'running-late': {
      const delay = item.isOnSchedule ? 15 : item.etaMinutes - parseMin(item.job.scheduledTime)
      return `Hi ${name}! Quick update — your team is running about ${delay} minutes behind schedule. New estimated arrival: ${item.etaTime}. We apologize for the delay and appreciate your patience! 🙏`
    }
    case 'arrived':
      return `Hi ${name}! Your cleaning team just arrived at ${address} ✅ We'll get started right away. Estimated completion: ${minToTime(parseMin(item.job.scheduledTime) + item.job.estimatedDuration)}. Thank you for choosing David's Cleaning!`
    case 'complete':
      return `Hi ${name}! Your home is sparkling clean 🌟 Our team just finished at ${address}. Total: ${price}. Please send payment via Zelle/Venmo at your convenience. Thank you — see you next time! 🏠`
  }
}

const SERVICE_COLORS: Record<string, string> = {
  standard: 'bg-violet-500/15 text-violet-400',
  deep: 'bg-purple-500/15 text-purple-500',
  'move-out': 'bg-amber-500/15 text-amber-500',
  airbnb: 'bg-teal-500/15 text-teal-500',
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'neutral'> = {
  scheduled: 'default', confirmed: 'success', 'in-progress': 'warning', completed: 'neutral',
}

const SECTION_LABEL = 'text-[11px] font-bold tracking-[0.09em] uppercase text-ink-400'

export function MessagesClient({ jobs, customers, cleaners }: MessagesData) {
  const schedule = useMemo(() => buildJobSchedule(jobs, customers, cleaners), [jobs, customers, cleaners])
  const [selected, setSelected] = useState<EnrichedJob | null>(schedule[0] || null)
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('on-way')
  const [message, setMessage] = useState(() =>
    schedule[0] ? buildMessage('on-way', schedule[0]) : ''
  )
  const [sentSet, setSentSet] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'routes' | 'compose' | 'sent'>('routes')

  function selectJob(item: EnrichedJob) {
    setSelected(item)
    setMessage(buildMessage(activeTemplate, item))
    setMobilePanel('compose')
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
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {/* Mobile tab bar */}
      <div className="flex md:hidden flex-shrink-0 border-b border-ink-100 bg-rail">
        {(['routes', 'compose', 'sent'] as const).map(panel => (
          <button
            key={panel}
            onClick={() => setMobilePanel(panel)}
            className={cn(
              'flex-1 py-3 text-sm font-medium capitalize transition-colors',
              mobilePanel === panel
                ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10'
                : 'text-ink-500'
            )}
          >
            {panel === 'routes' ? 'Routes' : panel === 'compose' ? 'Compose' : 'Sent'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: Schedule timeline */}
        <div className={cn(
          'flex-shrink-0 flex flex-col border-ink-100 bg-rail',
          'w-full md:w-80 md:border-r',
          mobilePanel !== 'routes' ? 'hidden md:flex' : 'flex'
        )}>
          <div className="p-4 border-b border-ink-100">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-ink-900">Today&apos;s Routes</h2>
              <span className="ml-auto text-[11px] text-ink-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-[12px] text-ink-500">Select a job to compose a client notification</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {schedule.length === 0 && (
              <div className="p-6 text-center">
                <Timer className="h-8 w-8 text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-500">No jobs scheduled today</p>
              </div>
            )}

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[2.15rem] top-4 bottom-4 w-px bg-ink-100" />

              {schedule.map((item, idx) => {
                const isActive = selected?.job.id === item.job.id
                const hasSent = [...sentSet].some(k => k.startsWith(item.job.id))

                return (
                  <button
                    key={item.job.id}
                    onClick={() => selectJob(item)}
                    className={cn(
                      'relative w-full flex items-start gap-3 px-3 py-3.5 text-left transition-colors',
                      isActive ? 'bg-violet-500/10' : 'hover:bg-hover',
                      idx < schedule.length - 1 && 'border-b border-ink-100/50'
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
                        ? 'border-violet-500 bg-violet-500/20'
                        : 'border-ink-200 bg-soft'
                    )}>
                      {item.job.status === 'in-progress' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                      {item.job.status === 'completed' && (
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                      )}
                      {(item.job.status === 'scheduled' || item.job.status === 'confirmed') && isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-ink-700 truncate">
                          {item.customer?.name || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                          {hasSent && <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />}
                          {!item.isOnSchedule && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-3 w-3 text-ink-400" />
                        <span className="text-[12px] text-ink-500 tnum">{item.etaTime}</span>
                        {!item.isOnSchedule && (
                          <span className="text-[11px] text-amber-500">delayed</span>
                        )}
                        <span className={cn(
                          'rounded px-1.5 py-0.5 text-[11px] font-medium',
                          SERVICE_COLORS[item.job.serviceType] || 'bg-ink-500/15 text-ink-500'
                        )}>
                          {getServiceLabel(item.job.serviceType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-ink-400 flex-shrink-0" />
                        <span className="text-[12px] text-ink-400 truncate">
                          {item.customer?.address?.split(',')[0]}
                        </span>
                      </div>
                      {item.driveFromPrev !== null && (
                        <div className="mt-1 flex items-center gap-1">
                          <Car className="h-3 w-3 text-ink-300" />
                          <span className="text-[11px] text-ink-300">{item.driveFromPrev}min drive from prev</span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center: Notification Composer */}
        <div className={cn(
          'flex flex-1 flex-col overflow-hidden',
          mobilePanel !== 'compose' ? 'hidden md:flex' : 'flex'
        )}>
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
                <div className="px-6 py-5 border-b border-ink-100 bg-rail">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-white">
                          {selected.customer?.name?.split(' ').map(n => n[0]).join('') || '??'}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-ink-900">{selected.customer?.name || 'Unknown Customer'}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="h-3 w-3 text-ink-500" />
                            <span className="text-[12px] text-ink-500 tnum">{selected.customer?.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_BADGE[selected.job.status] || 'default'} className="capitalize">
                          {selected.job.status}
                        </Badge>
                        <span className="text-[12px] text-ink-500">
                          {getServiceLabel(selected.job.serviceType)} · {selected.job.estimatedDuration} min
                        </span>
                        <span className="text-[12px] text-ink-500">·</span>
                        <span className="text-[12px] font-medium text-emerald-500 tnum">{formatCurrency(selected.job.price)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tnum text-ink-900 text-[28px] font-bold tracking-[-0.02em]">{selected.etaTime}</div>
                      <div className="text-[12px] text-ink-500 mt-0.5">
                        {selected.isOnSchedule ? 'on schedule' : 'running late'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ETA Breakdown */}
                <div className="px-6 py-4 border-b border-ink-100">
                  <p className={cn('mb-3', SECTION_LABEL)}>ETA Breakdown</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selected.prevJobEnd !== null ? (
                      <>
                        <div className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <div>
                            <div className="text-[11px] text-ink-500">Prev job ends</div>
                            <div className="text-sm font-semibold text-ink-900 tnum">{minToTime(selected.prevJobEnd)}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-ink-300" />
                        <div className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2">
                          <Car className="h-3.5 w-3.5 text-violet-400" />
                          <div>
                            <div className="text-[11px] text-ink-500">Drive time</div>
                            <div className="text-sm font-semibold text-ink-900 tnum">{selected.driveFromPrev} min</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-ink-300" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2">
                          <Timer className="h-3.5 w-3.5 text-violet-400" />
                          <div>
                            <div className="text-[11px] text-ink-500">First job of day</div>
                            <div className="text-sm font-semibold text-ink-900">Starting fresh</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-ink-300" />
                      </>
                    )}
                    <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
                      <Navigation className="h-3.5 w-3.5 text-violet-400" />
                      <div>
                        <div className="text-[11px] text-violet-400">Arrives at</div>
                        <div className="text-sm font-bold text-ink-900 tnum">{selected.etaTime}</div>
                      </div>
                    </div>
                    {!selected.isOnSchedule && (
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        <div>
                          <div className="text-[11px] text-amber-500">Delay</div>
                          <div className="text-sm font-bold text-ink-900 tnum">
                            +{selected.etaMinutes - parseMin(selected.job.scheduledTime)} min
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team pills */}
                <div className="px-6 py-3.5 border-b border-ink-100">
                  <div className="flex items-center gap-2">
                    <span className={SECTION_LABEL}>Team</span>
                    {selected.cleaners.map(c => (
                      <div key={c.id} className="flex items-center gap-1.5 rounded-full bg-soft pl-1.5 pr-2.5 py-1">
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: c.color }}
                        >
                          {c.initials}
                        </div>
                        <span className="text-[12px] text-ink-700">{c.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template selector */}
                <div className="px-6 py-4 border-b border-ink-100">
                  <p className={cn('mb-2.5', SECTION_LABEL)}>Notification Type</p>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tmpl]) => (
                      <button
                        key={key}
                        onClick={() => selectTemplate(key)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                          activeTemplate === key
                            ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                            : 'border-ink-100 text-ink-500 hover:border-ink-200 hover:text-ink-700'
                        )}
                      >
                        <tmpl.icon className={cn('h-3.5 w-3.5', activeTemplate === key ? 'text-violet-400' : 'text-ink-400')} />
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message editor */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className={SECTION_LABEL}>Message Preview</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                      <MessageSquare className="h-3 w-3" />
                      SMS · {message.length} chars
                    </div>
                  </div>

                  {/* Phone mockup */}
                  <div className="mx-auto max-w-sm">
                    <div className="rounded-2xl border border-ink-100 bg-card p-4">
                      {/* SMS header */}
                      <div className="mb-3 flex items-center gap-2 border-b border-ink-100 pb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-[11px] font-bold text-white">
                          DC
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink-900">David&apos;s Cleaning</div>
                          <div className="text-[11px] text-ink-500">SMS Notification</div>
                        </div>
                      </div>
                      <div className="rounded-xl bg-soft p-3.5 text-sm text-ink-700 leading-relaxed">
                        {message}
                      </div>
                    </div>
                  </div>

                  {/* Editable textarea */}
                  <div className="mt-4">
                    <p className="text-[11px] text-ink-400 mb-2">Edit message</p>
                    <textarea
                      className="w-full resize-none rounded-xl bg-soft border border-ink-100 px-4 py-3 text-sm text-ink-700 placeholder:text-ink-400 focus:outline-none focus:border-violet-500/40 transition-colors"
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                    />
                  </div>
                </div>

                {/* Send bar */}
                <div className="px-6 py-4 border-t border-ink-100 bg-rail">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-ink-700">
                        Send to: {selected.customer?.name}
                      </div>
                      <div className="text-[12px] text-ink-500 mt-0.5 tnum">{selected.customer?.phone}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMessage(buildMessage(activeTemplate, selected))}
                      className="gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim() || sending || isSent}
                      size="sm"
                      className={cn('gap-2 min-w-[140px]', isSent && 'bg-emerald-500 hover:bg-emerald-500')}
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
              <Bell className="h-10 w-10 text-ink-300" />
              <p className="text-sm font-medium text-ink-500">No jobs today</p>
              <p className="text-xs text-ink-400">Add jobs to the schedule to send arrival notifications</p>
            </div>
          )}
        </div>

        {/* Right sidebar: send log */}
        <div className={cn(
          'flex-shrink-0 border-ink-100 bg-rail p-4',
          'w-full md:w-56 md:border-l',
          mobilePanel !== 'sent' ? 'hidden md:block' : 'block'
        )}>
          <p className={cn('mb-3', SECTION_LABEL)}>Sent Today</p>

          {sentSet.size === 0 ? (
            <div className="py-5 text-center">
              <Send className="h-6 w-6 text-ink-300 mx-auto mb-2" />
              <p className="text-[12px] text-ink-400">No messages sent yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...sentSet].map(key => {
                const [jobId, tpl] = key.split('-') as [string, TemplateKey]
                const item = schedule.find(s => s.job.id === jobId)
                if (!item) return null
                return (
                  <div key={key} className="rounded-lg bg-soft border border-ink-100 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[11px] font-medium text-emerald-500">Sent</span>
                    </div>
                    <p className="text-[13px] font-medium text-ink-700 truncate">{item.customer?.name}</p>
                    <p className="text-[11px] text-ink-400">{TEMPLATES[tpl]?.label}</p>
                    <p className="text-[11px] text-ink-400 tnum">{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 border-t border-ink-100 pt-4">
            <p className={cn('mb-2.5', SECTION_LABEL)}>Today&apos;s Stats</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[12px] text-ink-500">Jobs</span>
                <span className="text-[13px] font-semibold text-ink-900 tnum">{schedule.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-ink-500">Notified</span>
                <span className="text-[13px] font-semibold text-emerald-500 tnum">{new Set([...sentSet].map(k => k.split('-')[0])).size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-ink-500">Revenue</span>
                <span className="text-[13px] font-semibold text-ink-900 tnum">
                  {formatCurrency(schedule.reduce((s, i) => s + i.job.price, 0))}
                </span>
              </div>
              {schedule.some(s => !s.isOnSchedule) && (
                <div className="flex items-center gap-1.5 mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-[11px] text-amber-500">Delays detected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
