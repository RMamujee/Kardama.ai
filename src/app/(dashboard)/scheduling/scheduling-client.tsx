'use client'
import React, { useState, useMemo, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Plus, Sparkles, Inbox, CheckCircle2, XCircle, Clock, Pencil, Trash2, Users, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { useSchedulingStore } from '@/store/useSchedulingStore'
import { formatTime, getServiceLabel, cn, formatCurrency } from '@/lib/utils'
import { SERVICE_DURATIONS } from '@/lib/services'
import { BookingWizard } from '@/components/scheduling/BookingWizard'
import { acceptBookingRequest, declineBookingRequest, updateJob, deleteJob } from '@/app/actions/scheduling'
import type { Cleaner, Customer, Job, Team } from '@/types'
import type { BookingRequest } from '@/lib/data'

type SchedulingData = {
  cleaners: Cleaner[]
  customers: Customer[]
  jobs: Job[]
  bookingRequests: BookingRequest[]
  confirmedBookings: BookingRequest[]
  teams: Team[]
}

const TEAM_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-sky-500/12',     text: 'text-sky-600',     border: 'border-sky-500/30' },
  2: { bg: 'bg-violet-500/12',  text: 'text-violet-600',  border: 'border-violet-500/30' },
  3: { bg: 'bg-orange-500/12',  text: 'text-orange-600',  border: 'border-orange-500/30' },
  4: { bg: 'bg-fuchsia-500/12', text: 'text-fuchsia-600', border: 'border-fuchsia-500/30' },
  5: { bg: 'bg-teal-500/12',    text: 'text-teal-600',    border: 'border-teal-500/30' },
}

function teamBlockStyle(color: string): React.CSSProperties {
  return { backgroundColor: `${color}22`, borderColor: `${color}55`, color }
}

const SERVICE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep Clean' },
  { value: 'move-out', label: 'Move-Out' },
  { value: 'post-construction', label: 'Post-Construction' },
  { value: 'airbnb', label: 'Airbnb' },
]


function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7) // 7am to 5pm
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const day = now.getDay()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - day + (offset * 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

function getMonthCalendarDates(offset: number): Date[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + offset
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const startPad = firstOfMonth.getDay()
  const endPad = 6 - lastOfMonth.getDay()
  const start = new Date(year, month, 1 - startPad)
  const end = new Date(year, month + 1, endPad)
  const dates: Date[] = []
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function fmtDisplayDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDisplayTime(timeStr: string | null): string {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

type JobDraft = {
  scheduledDate: string
  scheduledTime: string
  estimatedDuration: number
  serviceType: string
  status: string
  price: number
  cleanerIds: string[]
  notes: string
}

function getRecurringOccurrencesInWindow(
  preferredDate: string,
  cleaningFrequency: string | null,
  windowStart: string,
  windowEnd: string,
): string[] {
  if (!preferredDate) return []
  const freqDays = cleaningFrequency === 'weekly' ? 7
    : (cleaningFrequency === 'bi-weekly' || cleaningFrequency === 'biweekly') ? 14
    : 0
  if (freqDays === 0) {
    return preferredDate >= windowStart && preferredDate <= windowEnd ? [preferredDate] : []
  }
  const startMs = new Date(windowStart + 'T12:00:00').getTime()
  const endMs = new Date(windowEnd + 'T12:00:00').getTime()
  const baseMs = new Date(preferredDate + 'T12:00:00').getTime()
  const freqMs = freqDays * 86_400_000
  if (baseMs > endMs) return []
  let cur = baseMs
  if (cur < startMs) {
    cur += Math.ceil((startMs - cur) / freqMs) * freqMs
  }
  const results: string[] = []
  while (cur <= endMs) {
    results.push(new Date(cur).toISOString().split('T')[0])
    cur += freqMs
  }
  return results
}

export function SchedulingClient({ cleaners, customers, jobs, bookingRequests, confirmedBookings, teams: teamsList }: SchedulingData) {
  const { weekOffset, setWeekOffset, openBooking, bookingOpen } = useSchedulingStore()
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<JobDraft | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionTarget, setActionTarget] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [monthOffset, setMonthOffset] = useState(0)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeclineBooking, setConfirmDeclineBooking] = useState(false)
  const [isDecliningBooking, setIsDecliningBooking] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null)
  const [pickedTeamId, setPickedTeamId] = useState<string | null>(null)
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null)

  const teams = useMemo(() => {
    const teamNameById = new Map(teamsList.map(t => [t.id, t.name]))
    const map = new Map<string, { teamId: string; color: string; names: string[]; teamName: string }>()
    for (const c of cleaners) {
      if (!map.has(c.teamId)) {
        map.set(c.teamId, {
          teamId: c.teamId,
          color: c.color,
          names: [],
          teamName: teamNameById.get(c.teamId) ?? c.teamId,
        })
      }
      map.get(c.teamId)!.names.push(c.name)
    }
    return [...map.values()]
  }, [cleaners, teamsList])

  function toggleTeam(teamId: string) {
    setSelectedTeams(prev => {
      if (prev.size === 0) return new Set([teamId])
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
        return next.size === 0 ? new Set() : next
      }
      next.add(teamId)
      return next.size === teams.length ? new Set() : next
    })
  }

  const filteredJobs = useMemo(() => {
    if (selectedTeams.size === 0) return jobs
    return jobs.filter(job => {
      const lead = cleaners.find(c => job.cleanerIds.includes(c.id))
      return lead && selectedTeams.has(lead.teamId)
    })
  }, [jobs, cleaners, selectedTeams])

  const jobsByDay = useMemo(() => {
    const map: Record<string, Job[]> = {}
    weekDates.forEach(d => { map[fmtDate(d)] = [] })
    filteredJobs.forEach(j => {
      if (map[j.scheduledDate]) map[j.scheduledDate].push(j)
    })
    return map
  }, [filteredJobs, weekDates])

  const confirmedByDay = useMemo(() => {
    const map: Record<string, BookingRequest[]> = {}
    weekDates.forEach(d => { map[fmtDate(d)] = [] })
    const windowStart = fmtDate(weekDates[0])
    const windowEnd = fmtDate(weekDates[6])
    confirmedBookings.forEach(b => {
      if (!b.preferredDate) return
      const dates = getRecurringOccurrencesInWindow(b.preferredDate, b.cleaningFrequency, windowStart, windowEnd)
      dates.forEach(dateStr => { if (map[dateStr] !== undefined) map[dateStr].push(b) })
    })
    return map
  }, [confirmedBookings, weekDates])

  const currentMonthDate = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  }, [monthOffset])

  const monthDates = useMemo(() => getMonthCalendarDates(monthOffset), [monthOffset])
  const monthJobsByDay = useMemo(() => {
    const map: Record<string, Job[]> = {}
    monthDates.forEach(d => { map[fmtDate(d)] = [] })
    filteredJobs.forEach(j => { if (map[j.scheduledDate] !== undefined) map[j.scheduledDate].push(j) })
    return map
  }, [filteredJobs, monthDates])

  const monthConfirmedByDay = useMemo(() => {
    const map: Record<string, BookingRequest[]> = {}
    monthDates.forEach(d => { map[fmtDate(d)] = [] })
    if (monthDates.length === 0) return map
    const windowStart = fmtDate(monthDates[0])
    const windowEnd = fmtDate(monthDates[monthDates.length - 1])
    confirmedBookings.forEach(b => {
      if (!b.preferredDate) return
      const dates = getRecurringOccurrencesInWindow(b.preferredDate, b.cleaningFrequency, windowStart, windowEnd)
      dates.forEach(dateStr => { if (map[dateStr] !== undefined) map[dateStr].push(b) })
    })
    return map
  }, [confirmedBookings, monthDates])

  const today = fmtDate(new Date())

  const selectedCustomer = useMemo(
    () => selectedJob ? customers.find(c => c.id === selectedJob.customerId) ?? null : null,
    [selectedJob, customers],
  )

  function handleDelete() {
    if (!selectedJob) return
    setIsDeleting(true)
    startTransition(async () => {
      try {
        await deleteJob(selectedJob.id)
        setSelectedJob(null)
        setConfirmDelete(false)
        setEditMode(false)
        setDraft(null)
      } catch (e) {
        setAcceptError(e instanceof Error ? e.message : 'Failed to delete job')
      } finally {
        setIsDeleting(false)
        setConfirmDelete(false)
      }
    })
  }

  function handleAccept(id: string, teamId: string) {
    setActionTarget(id)
    setAcceptError(null)
    startTransition(async () => {
      try {
        await acceptBookingRequest(id, teamId)
        setScheduleTarget(null)
        setPickedTeamId(null)
      } catch (e) {
        setAcceptError(e instanceof Error ? e.message : 'Failed to schedule booking')
      } finally {
        setActionTarget(null)
      }
    })
  }

  // Returns a conflicting job if any cleaner on `teamId` is busy during the
  // proposed slot, otherwise null. Mirrors the server-side check so we can
  // disable busy teams in the picker before the round-trip.
  function teamConflictAt(teamId: string, date: string | null, time: string | null, duration: number): Job | null {
    if (!date) return null
    const proposedStart = timeToMinutes(time ?? '09:00')
    const proposedEnd = proposedStart + duration
    const teamCleanerIds = new Set(cleaners.filter(c => c.teamId === teamId).map(c => c.id))
    for (const j of jobs) {
      if (j.scheduledDate !== date) continue
      if (j.status === 'cancelled') continue
      if (!j.cleanerIds.some(id => teamCleanerIds.has(id))) continue
      const start = timeToMinutes(j.scheduledTime)
      const end = start + (j.estimatedDuration ?? 180)
      if (start < proposedEnd && proposedStart < end) return j
    }
    return null
  }

  type AvailabilityBlock =
    | { blocked: false }
    | { blocked: true; reason: 'no-schedule'; name: string }
    | { blocked: true; reason: 'day-off'; name: string }
    | { blocked: true; reason: 'outside-hours'; name: string; start: string; end: string }

  // Returns the first availability problem for the team, or {blocked:false} if clear.
  function teamAvailabilityAt(teamId: string, date: string | null, time: string | null, duration: number): AvailabilityBlock {
    if (!date || !time) return { blocked: false }
    const dayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const)[new Date(date + 'T12:00:00').getDay()]
    const teamCleaners = cleaners.filter(c => c.teamId === teamId)
    for (const c of teamCleaners) {
      const h = c.availableHours
      // No schedule data at all, or this day was never entered in mobile app
      if (!h || Object.keys(h).length === 0 || !(dayName in h)) {
        return { blocked: true, reason: 'no-schedule', name: c.name.split(' ')[0] }
      }
      const dayHours = h[dayName]
      // Explicitly marked off for this day
      if (dayHours === null) {
        return { blocked: true, reason: 'day-off', name: c.name.split(' ')[0] }
      }
      // Job falls outside their working window
      const workStart = timeToMinutes(dayHours.start)
      const workEnd = timeToMinutes(dayHours.end)
      const jobStart = timeToMinutes(time)
      const jobEnd = jobStart + duration
      if (jobStart < workStart || jobEnd > workEnd) {
        return { blocked: true, reason: 'outside-hours', name: c.name.split(' ')[0], start: dayHours.start, end: dayHours.end }
      }
    }
    return { blocked: false }
  }

  function handleDecline(id: string) {
    setActionTarget(id)
    startTransition(async () => {
      try {
        await declineBookingRequest(id)
      } catch {
        // silent — decline failure is non-critical
      } finally {
        setActionTarget(null)
      }
    })
  }

  function handleDeclineBooking() {
    if (!selectedBooking) return
    setIsDecliningBooking(true)
    startTransition(async () => {
      try {
        await declineBookingRequest(selectedBooking.id)
        setSelectedBooking(null)
        setConfirmDeclineBooking(false)
      } catch (e) {
        setAcceptError(e instanceof Error ? e.message : 'Failed to decline booking')
      } finally {
        setIsDecliningBooking(false)
        setConfirmDeclineBooking(false)
      }
    })
  }

  function openEdit(job: Job) {
    setDraft({
      scheduledDate: job.scheduledDate,
      scheduledTime: job.scheduledTime,
      estimatedDuration: job.estimatedDuration,
      serviceType: job.serviceType,
      status: job.status,
      price: job.price,
      cleanerIds: [...job.cleanerIds],
      notes: job.notes ?? '',
    })
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setDraft(null)
  }

  function saveEdit() {
    if (!selectedJob || !draft) return
    setIsSaving(true)
    setAcceptError(null)
    startTransition(async () => {
      try {
        await updateJob(selectedJob.id, draft)
        setEditMode(false)
        setDraft(null)
        setSelectedJob(null)
      } catch (e) {
        setAcceptError(e instanceof Error ? e.message : 'Failed to save job')
      } finally {
        setIsSaving(false)
      }
    })
  }

  function toggleCleaner(cleanerId: string) {
    if (!draft) return
    setDraft(prev => {
      if (!prev) return prev
      const ids = prev.cleanerIds.includes(cleanerId)
        ? prev.cleanerIds.filter(id => id !== cleanerId)
        : [...prev.cleanerIds, cleanerId]
      return { ...prev, cleanerIds: ids }
    })
  }

  function selectJob(job: Job) {
    setSelectedJob(job)
    setSelectedBooking(null)
    setEditMode(false)
    setDraft(null)
  }

  function selectBooking(booking: BookingRequest) {
    setSelectedBooking(booking)
    setSelectedJob(null)
    setEditMode(false)
    setDraft(null)
    setConfirmDeclineBooking(false)
  }

  const monthLabel = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="flex items-center rounded-[8px] border border-line overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium transition-colors',
                view === 'week' ? 'bg-mint-500 text-white' : 'text-ink-500 hover:text-ink-700',
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium border-l border-line transition-colors',
                view === 'month' ? 'bg-mint-500 text-white' : 'text-ink-500 hover:text-ink-700',
              )}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <Button
            variant="outline" size="icon"
            onClick={() => view === 'week' ? setWeekOffset(weekOffset - 1) : setMonthOffset(monthOffset - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[13px] font-medium text-ink-700 min-w-[160px] text-center">
            {view === 'week'
              ? `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : monthLabel
            }
          </span>
          <Button
            variant="outline" size="icon"
            onClick={() => view === 'week' ? setWeekOffset(weekOffset + 1) : setMonthOffset(monthOffset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {(view === 'week' ? weekOffset !== 0 : monthOffset !== 0) && (
            <Button variant="ghost" size="sm" onClick={() => view === 'week' ? setWeekOffset(0) : setMonthOffset(0)}>
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedTeams.size > 0 && (
            <button
              onClick={() => setSelectedTeams(new Set())}
              className="px-2.5 py-1 rounded-[7px] text-[11px] font-medium text-ink-400 border border-line hover:text-ink-700 transition-colors"
            >
              All
            </button>
          )}
          {teams.map(team => {
            const active = selectedTeams.size === 0 || selectedTeams.has(team.teamId)
            return (
              <button
                key={team.teamId}
                onClick={() => toggleTeam(team.teamId)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-colors',
                  active ? 'opacity-100' : 'opacity-35 hover:opacity-60',
                )}
                style={active ? teamBlockStyle(team.color) : { borderColor: team.color + '44', color: team.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: team.color }} />
                {team.teamName}
              </button>
            )
          })}
        </div>
        <Button onClick={openBooking}>
          <Plus className="h-[15px] w-[15px]" strokeWidth={2.5} /> New Job
        </Button>
      </div>

      {/* Accept error banner */}
      {acceptError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-500">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {acceptError}
          <button onClick={() => setAcceptError(null)} className="ml-auto text-[11px] opacity-60 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Pending Booking Requests */}
      {bookingRequests.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-amber-500/12">
              <Inbox className="h-[14px] w-[14px] text-amber-500" />
            </div>
            <h2 className="text-[13.5px] font-semibold text-ink-900 tracking-[-0.01em]">
              Pending Requests
            </h2>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-600">
              {bookingRequests.length}
            </span>
          </div>
          <div className="divide-y divide-line">
            {bookingRequests.map(req => {
              const busy = isPending && actionTarget === req.id
              const isPicking = scheduleTarget === req.id
              const duration = SERVICE_DURATIONS[req.serviceType] ?? 180
              return (
                <div key={req.id} className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-ink-900">{req.customerName}</p>
                        <Badge variant="neutral" className="text-[11px]">{getServiceLabel(req.serviceType)}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-ink-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {req.preferredDate ? fmtDisplayDate(req.preferredDate) : '—'}{' '}
                          {req.preferredTime ? `at ${fmtDisplayTime(req.preferredTime)}` : ''}
                        </span>
                        <span className="truncate">{req.address}</span>
                      </div>
                      {req.notes && (
                        <p className="text-[11.5px] text-ink-400 truncate">{req.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {confirmDeclineId === req.id ? (
                        <>
                          <span className="text-[11.5px] text-ink-400 hidden sm:inline">Decline this request?</span>
                          <button
                            onClick={() => setConfirmDeclineId(null)}
                            disabled={busy}
                            className="rounded-lg border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-500 hover:text-ink-700 disabled:opacity-40 transition-colors"
                          >
                            No
                          </button>
                          <button
                            onClick={() => { handleDecline(req.id); setConfirmDeclineId(null) }}
                            disabled={busy}
                            className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
                          >
                            Yes, decline
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setConfirmDeclineId(req.id); setScheduleTarget(null) }}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:border-rose-500/40 hover:text-rose-500 disabled:opacity-40 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Decline
                        </button>
                      )}
                      {!isPicking ? (
                        <button
                          onClick={() => {
                            setScheduleTarget(req.id)
                            setPickedTeamId(null)
                            setAcceptError(null)
                          }}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg bg-mint-500/12 border border-mint-500/25 px-3 py-1.5 text-[12px] font-medium text-mint-500 hover:bg-mint-500/20 disabled:opacity-40 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Schedule
                        </button>
                      ) : (
                        <button
                          onClick={() => { setScheduleTarget(null); setPickedTeamId(null) }}
                          disabled={busy}
                          className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-700 disabled:opacity-40 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  {isPicking && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-line bg-soft/60 p-5 space-y-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-mint-500/12 flex-shrink-0">
                          <Users className="h-[15px] w-[15px] text-mint-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink-900 tracking-[-0.01em]">
                            Assign a cleaning team
                          </p>
                          <p className="text-[12px] text-ink-500 mt-0.5 leading-[1.55]">
                            Pick the team that will handle this booking. Teams already on another job at this time are shown as unavailable.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teams.map(team => {
                          const avail = teamAvailabilityAt(team.teamId, req.preferredDate, req.preferredTime, duration)
                          const conflict = !avail.blocked ? teamConflictAt(team.teamId, req.preferredDate, req.preferredTime, duration) : null
                          const isBlocked = avail.blocked || !!conflict
                          const picked = pickedTeamId === team.teamId
                          const teamCleaners = cleaners.filter(c => c.teamId === team.teamId)
                          return (
                            <button
                              key={team.teamId}
                              type="button"
                              onClick={() => !isBlocked && setPickedTeamId(team.teamId)}
                              disabled={isBlocked || busy}
                              className={cn(
                                'group relative flex items-start gap-3 rounded-xl border bg-surface p-4 text-left transition-all',
                                isBlocked
                                  ? 'opacity-50 cursor-not-allowed border-line'
                                  : picked
                                    ? 'border-transparent shadow-[0_0_0_2px_rgba(0,0,0,0.04)] ring-2 ring-offset-2 ring-offset-soft'
                                    : 'border-line hover:border-ink-300 hover:shadow-sm cursor-pointer',
                              )}
                              style={picked && !isBlocked
                                ? { borderColor: team.color, ...teamBlockStyle(team.color), boxShadow: `0 0 0 1px ${team.color}33` }
                                : undefined
                              }
                            >
                              <div className="flex -space-x-1.5 flex-shrink-0">
                                {teamCleaners.map(c => (
                                  <Avatar key={c.id} initials={c.initials} color={c.color} size="sm" />
                                ))}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: team.color }} />
                                  <p className={cn(
                                    'text-[13px] font-semibold tracking-[-0.01em] truncate',
                                    picked && !isBlocked ? '' : 'text-ink-900',
                                  )}>
                                    {team.teamName}
                                  </p>
                                </div>
                                {avail.blocked ? (
                                  <p className="text-[11.5px] text-amber-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {avail.reason === 'no-schedule'
                                      ? `${avail.name}: schedule not set in app`
                                      : avail.reason === 'day-off'
                                      ? `${avail.name}: off this day`
                                      : `${avail.name}: works ${avail.start}–${avail.end}`}
                                  </p>
                                ) : conflict ? (
                                  <p className="text-[11.5px] text-ink-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Busy until {formatTime(conflict.scheduledTime)}
                                  </p>
                                ) : (
                                  <p className={cn(
                                    'text-[11.5px] mt-1',
                                    picked ? 'opacity-80' : 'text-emerald-500',
                                  )}>
                                    Available
                                  </p>
                                )}
                              </div>
                              {picked && !isBlocked && (
                                <CheckCircle2 className="absolute top-3 right-3 h-4 w-4" style={{ color: team.color }} />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-[11.5px] text-ink-400">
                          {pickedTeamId
                            ? <>Selected: <span className="font-medium text-ink-700">{teams.find(t => t.teamId === pickedTeamId)?.teamName}</span></>
                            : 'No team selected yet'
                          }
                        </p>
                        <button
                          onClick={() => pickedTeamId && handleAccept(req.id, pickedTeamId)}
                          disabled={!pickedTeamId || busy}
                          className="flex items-center gap-2 rounded-lg bg-mint-500 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-mint-600 disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {busy ? 'Scheduling…' : 'Confirm Booking'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Month Calendar */}
      {view === 'month' && (
        <div className="card overflow-hidden">
          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-line">
            {DAY_LABELS.map(d => (
              <div key={d} className="p-2.5 text-center text-[11px] font-medium uppercase tracking-[0.06em] text-ink-400 border-r border-line last:border-0">
                {d}
              </div>
            ))}
          </div>
          {/* Weeks */}
          {Array.from({ length: monthDates.length / 7 }, (_, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-b border-line last:border-0">
              {monthDates.slice(weekIdx * 7, weekIdx * 7 + 7).map((date, dayIdx) => {
                const dateStr = fmtDate(date)
                const dayJobs = monthJobsByDay[dateStr] ?? []
                const isCurrentMonth = date.getMonth() === currentMonthDate.getMonth()
                const isToday = dateStr === today
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'min-h-[96px] p-2 border-r border-line last:border-0 flex flex-col gap-1',
                      !isCurrentMonth && 'opacity-35',
                      isToday && 'bg-mint-500/[0.04]',
                    )}
                  >
                    <div className="flex-shrink-0">
                      <span className={cn(
                        'num inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-semibold',
                        isToday ? 'bg-mint-500 text-white' : 'text-ink-700',
                      )}>
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {(monthConfirmedByDay[dateStr] ?? []).slice(0, 2).map(booking => {
                        const tc = TEAM_COLORS[booking.assignedTeam ?? 0]
                        if (!tc) return null
                        return (
                          <button
                            key={booking.id}
                            onClick={() => selectBooking(booking)}
                            className={cn(
                              'w-full text-left rounded-[4px] border px-1.5 py-[2px] text-[10.5px] font-semibold truncate leading-[1.4]',
                              tc.bg, tc.text, tc.border,
                              selectedBooking?.id === booking.id && 'ring-1 ring-current/60',
                            )}
                          >
                            T{booking.assignedTeam} · {booking.address.split(',')[0]}
                          </button>
                        )
                      })}
                      {dayJobs.slice(0, 2).map(job => {
                        const teamColor = cleaners.find(c => job.cleanerIds.includes(c.id))?.color
                        return (
                          <button
                            key={job.id}
                            onClick={() => selectJob(job)}
                            className={cn(
                              'w-full text-left rounded-[4px] border px-1.5 py-[2px] text-[10.5px] font-semibold truncate leading-[1.4]',
                              selectedJob?.id === job.id && 'ring-1 ring-white/40',
                            )}
                            style={teamColor ? teamBlockStyle(teamColor) : undefined}
                          >
                            {formatTime(job.scheduledTime)} · {job.address.split(',')[0]}
                          </button>
                        )
                      })}
                      {((monthConfirmedByDay[dateStr] ?? []).length + dayJobs.length > 4) && (
                        <p className="text-[10px] text-ink-400 pl-1">+{(monthConfirmedByDay[dateStr] ?? []).length + dayJobs.length - 4} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Week Calendar */}
      {view === 'week' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b border-line">
                <div className="p-3 border-r border-line" />
                {weekDates.map((d, i) => {
                  const dateStr = fmtDate(d)
                  const isToday = dateStr === today
                  return (
                    <div
                      key={i}
                      className={cn(
                        'p-3 text-center',
                        i < 6 && 'border-r border-line',
                        isToday && 'bg-mint-500/8',
                      )}
                    >
                      <p className={cn(
                        'text-[11px] font-medium uppercase tracking-[0.06em]',
                        isToday ? 'text-mint-500' : 'text-ink-400',
                      )}>{DAY_LABELS[i]}</p>
                      <p className={cn(
                        'num text-[18px] font-semibold mt-1 tracking-[-0.02em]',
                        isToday ? 'text-mint-500' : 'text-ink-900',
                      )}>{d.getDate()}</p>
                      {jobsByDay[dateStr]?.length > 0 && (
                        <div className="mt-1 flex justify-center">
                          <span className="h-1 w-1 rounded-full bg-mint-500" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* All-day row — confirmed bookings (8 AM–4 PM blocks) */}
              <div className="grid grid-cols-8 border-b border-line">
                <div className="px-3 py-2 border-r border-line text-[10.5px] font-medium text-ink-400 leading-tight flex items-center">
                  all-day
                </div>
                {weekDates.map((d, di) => {
                  const dateStr = fmtDate(d)
                  const dayConfirmed = confirmedByDay[dateStr] ?? []
                  return (
                    <div
                      key={di}
                      className={cn(
                        'p-1 space-y-0.5 min-h-[36px]',
                        di < 6 && 'border-r border-line',
                        dateStr === today && 'bg-mint-500/[0.03]',
                      )}
                    >
                      {dayConfirmed.map(booking => {
                        const tc = TEAM_COLORS[booking.assignedTeam ?? 0]
                        if (!tc) return null
                        return (
                          <button
                            key={booking.id}
                            onClick={() => selectBooking(booking)}
                            className={cn(
                              'w-full rounded-[5px] border px-1.5 py-[2px] text-left text-[10px] font-semibold truncate leading-[1.4]',
                              tc.bg, tc.text, tc.border,
                              selectedBooking?.id === booking.id && 'ring-1 ring-offset-1 ring-current/60',
                            )}
                          >
                            T{booking.assignedTeam} · {booking.address.split(',')[0]}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Time rows */}
              <div className="max-h-[500px] overflow-y-auto">
                {HOURS.map(hour => (
                  <div key={hour} className="grid grid-cols-8 border-b border-line min-h-[64px] last:border-0">
                    <div className="px-3 py-2.5 num border-r border-line text-[11.5px] text-ink-400">
                      {hour > 12 ? `${hour-12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
                    </div>
                    {weekDates.map((d, di) => {
                      const dateStr = fmtDate(d)
                      const dayJobs = (jobsByDay[dateStr] || []).filter(j => {
                        const [h] = j.scheduledTime.split(':').map(Number)
                        return h === hour
                      })
                      const isToday = dateStr === today
                      return (
                        <div
                          key={di}
                          className={cn(
                            'p-1 space-y-1',
                            di < 6 && 'border-r border-line',
                            isToday && 'bg-mint-500/[0.03]',
                          )}
                        >
                          {dayJobs.map(job => {
                            const jobCleaners = cleaners.filter(c => job.cleanerIds.includes(c.id))
                            const teamColor = jobCleaners[0]?.color
                            return (
                              <button
                                key={job.id}
                                onClick={() => selectJob(job)}
                                className={cn(
                                  'w-full rounded-[8px] border p-2 text-left text-[12px]',
                                  selectedJob?.id === job.id && 'ring-2 ring-offset-1 ring-white/30',
                                )}
                                style={teamColor ? teamBlockStyle(teamColor) : undefined}
                              >
                                <p className="font-semibold truncate">{job.address.split(',')[0]}</p>
                                <p className="opacity-70 mt-0.5 text-[11px]">
                                  {formatTime(job.scheduledTime)}
                                  {jobCleaners.length > 0 && ` · ${jobCleaners.map(c => c.initials).join('+')}` }
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Panel */}
      {selectedJob && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">
                {editMode ? 'Edit Job' : confirmDelete ? 'Delete Job?' : 'Job Details'}
              </h2>
              <div className="flex items-center gap-2">
                {!editMode && !confirmDelete && (
                  <>
                    <button
                      onClick={() => openEdit(selectedJob)}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-600 hover:border-mint-500/40 hover:text-mint-500 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-1.5 text-[12px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </>
                )}
                {confirmDelete && (
                  <>
                    <p className="text-[12px] text-ink-500 mr-1">This cannot be undone.</p>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-700 disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded-lg bg-rose-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-700 disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={isSaving}
                      className="rounded-lg bg-mint-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-mint-600 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </>
                )}
                {!confirmDelete && (
                  <button
                    onClick={() => { setSelectedJob(null); setEditMode(false); setDraft(null); setConfirmDelete(false) }}
                    className="text-[12px] text-ink-400 hover:text-ink-700 bg-transparent border-0 cursor-pointer transition-colors ml-1"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Read mode */}
            {!editMode && !confirmDelete && (
              <div className="p-5">
                <div className="grid grid-cols-2 gap-5">
                  {selectedCustomer && (
                    <div className="col-span-2 rounded-lg border border-line bg-soft px-4 py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[12px] font-medium text-ink-500 mb-0.5">Customer</p>
                        <p className="text-[13px] font-semibold text-ink-900">{selectedCustomer.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-medium text-ink-500 mb-0.5">Phone</p>
                        <a href={`tel:${selectedCustomer.phone}`} className="text-[13px] font-medium text-mint-500 hover:text-mint-600">
                          {selectedCustomer.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Address</p>
                    <p className="text-[13px] font-medium text-ink-900">{selectedJob.address}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Service</p>
                    <p className="text-[13px] font-medium text-ink-900">{getServiceLabel(selectedJob.serviceType)}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Date</p>
                    <p className="text-[13px] font-medium text-ink-900">{fmtDisplayDate(selectedJob.scheduledDate)}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Time</p>
                    <p className="text-[13px] font-medium text-ink-900">{formatTime(selectedJob.scheduledTime)} · {selectedJob.estimatedDuration} min</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Price</p>
                    <p className="num text-[13px] font-semibold text-emerald-500">{formatCurrency(selectedJob.price)}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-2">Status</p>
                    <Badge variant="default">{selectedJob.status}</Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[12px] font-medium text-ink-500 mb-2">Team</p>
                    {(() => {
                      const jobCleaners = cleaners.filter(c => selectedJob.cleanerIds.includes(c.id))
                      if (jobCleaners.length === 0) return <p className="text-[12px] text-ink-400">Unassigned</p>
                      const teamObj = jobCleaners[0]?.teamId ? teams.find(t => t.teamId === jobCleaners[0].teamId) : null
                      return (
                        <div>
                          {teamObj && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: teamObj.color }} />
                              <span className="text-[12px] font-semibold" style={{ color: teamObj.color }}>{teamObj.teamName}</span>
                            </div>
                          )}
                          <div className="flex gap-3 flex-wrap">
                            {jobCleaners.map(c => (
                              <div key={c.id} className="flex items-center gap-2">
                                <Avatar initials={c.initials} color={c.color} size="sm" />
                                <span className="text-[13px] font-medium text-ink-900">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  {selectedJob.notes && (
                    <div className="col-span-2">
                      <p className="text-[12px] font-medium text-ink-500 mb-1.5">Notes</p>
                      <p className="text-[13px] text-ink-700">{selectedJob.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delete confirmation body */}
            {confirmDelete && (
              <div className="p-5 text-center space-y-3">
                <p className="text-[13px] text-ink-700">
                  Delete the job at <span className="font-semibold text-ink-900">{selectedJob.address.split(',')[0]}</span> on{' '}
                  <span className="font-semibold text-ink-900">{fmtDisplayDate(selectedJob.scheduledDate)}</span>?
                </p>
                <p className="text-[12px] text-ink-400">This will permanently remove it from the schedule.</p>
              </div>
            )}

            {/* Edit mode */}
            {editMode && draft && (
              <div className="p-5">
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={draft.scheduledDate}
                      onChange={e => setDraft(prev => prev ? { ...prev, scheduledDate: e.target.value } : prev)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Time</label>
                    <input
                      type="time"
                      value={draft.scheduledTime}
                      onChange={e => setDraft(prev => prev ? { ...prev, scheduledTime: e.target.value } : prev)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Service Type</label>
                    <select
                      value={draft.serviceType}
                      onChange={e => setDraft(prev => prev ? { ...prev, serviceType: e.target.value } : prev)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500/30 transition-colors"
                    >
                      {SERVICE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Status</label>
                    <select
                      value={draft.status}
                      onChange={e => setDraft(prev => prev ? { ...prev, status: e.target.value } : prev)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500/30 transition-colors"
                    >
                      {STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Price ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={draft.price}
                      onChange={e => setDraft(prev => prev ? { ...prev, price: Number(e.target.value) } : prev)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Duration (min)</label>
                    <input
                      type="number"
                      min={30}
                      step={15}
                      value={draft.estimatedDuration}
                      onChange={e => setDraft(prev => prev ? { ...prev, estimatedDuration: Number(e.target.value) } : prev)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-900 focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500/30 transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium text-ink-500 mb-2">Team Assignment</label>
                    <div className="flex flex-wrap gap-2">
                      {cleaners.map(c => {
                        const selected = draft.cleanerIds.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCleaner(c.id)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                              selected
                                ? 'border-mint-500/40 bg-mint-500/10 text-mint-600'
                                : 'border-line bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700',
                            )}
                          >
                            <Avatar initials={c.initials} color={c.color} size="xs" />
                            {c.name}
                            {selected && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Notes</label>
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={e => setDraft(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                      placeholder="Any special instructions…"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500/30 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Confirmed Booking Detail Panel */}
      {selectedBooking && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">
                  {confirmDeclineBooking ? 'Decline Booking?' : 'Confirmed Booking'}
                </h2>
                {!confirmDeclineBooking && selectedBooking.assignedTeam && (() => {
                  const tc = TEAM_COLORS[selectedBooking.assignedTeam]
                  return tc ? (
                    <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', tc.bg, tc.text, tc.border)}>
                      Team {selectedBooking.assignedTeam}
                    </span>
                  ) : null
                })()}
              </div>
              <div className="flex items-center gap-2">
                {!confirmDeclineBooking ? (
                  <>
                    <button
                      onClick={() => setConfirmDeclineBooking(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-1.5 text-[12px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                      Decline
                    </button>
                    <button
                      onClick={() => { setSelectedBooking(null); setConfirmDeclineBooking(false) }}
                      className="text-[12px] text-ink-400 hover:text-ink-700 bg-transparent border-0 cursor-pointer transition-colors ml-1"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-ink-500 mr-1">This cannot be undone.</p>
                    <button
                      onClick={() => setConfirmDeclineBooking(false)}
                      disabled={isDecliningBooking}
                      className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-700 disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeclineBooking}
                      disabled={isDecliningBooking}
                      className="rounded-lg bg-rose-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
                    >
                      {isDecliningBooking ? 'Declining…' : 'Yes, decline'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {confirmDeclineBooking ? (
              <div className="p-5 text-center space-y-3">
                <p className="text-[13px] text-ink-700">
                  Decline the booking for <span className="font-semibold text-ink-900">{selectedBooking.customerName}</span> on{' '}
                  <span className="font-semibold text-ink-900">{fmtDisplayDate(selectedBooking.preferredDate ?? '')}</span>?
                </p>
                <p className="text-[12px] text-ink-400">This will remove it from the schedule and cancel the assigned job.</p>
              </div>
            ) : (
              <div className="p-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Customer</p>
                    <p className="text-[13px] font-semibold text-ink-900">{selectedBooking.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Phone</p>
                    <a href={`tel:${selectedBooking.customerPhone}`} className="text-[13px] font-medium text-mint-500 hover:text-mint-600">
                      {selectedBooking.customerPhone}
                    </a>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Address</p>
                    <p className="text-[13px] font-medium text-ink-900">{selectedBooking.address}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Service</p>
                    <p className="text-[13px] font-medium text-ink-900">{getServiceLabel(selectedBooking.serviceType)}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Date</p>
                    <p className="text-[13px] font-medium text-ink-900">{fmtDisplayDate(selectedBooking.preferredDate ?? '')}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-ink-500 mb-1.5">Time</p>
                    <p className="text-[13px] font-medium text-ink-900">
                      {selectedBooking.preferredTime ? fmtDisplayTime(selectedBooking.preferredTime) : '8:00 AM – 4:00 PM'}
                    </p>
                  </div>
                  {selectedBooking.customerEmail && (
                    <div className="col-span-2">
                      <p className="text-[12px] font-medium text-ink-500 mb-1.5">Email</p>
                      <a href={`mailto:${selectedBooking.customerEmail}`} className="text-[13px] font-medium text-mint-500 hover:text-mint-600">
                        {selectedBooking.customerEmail}
                      </a>
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div className="col-span-2">
                      <p className="text-[12px] font-medium text-ink-500 mb-1.5">Notes</p>
                      <p className="text-[13px] text-ink-700">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* AI Info Banner */}
      <div className="card flex items-center gap-3 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] flex-shrink-0 bg-mint-500/12">
          <Sparkles className="h-[16px] w-[16px] text-mint-500" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink-900">AI Scheduling Active</p>
          <p className="text-[12.5px] text-ink-500 mt-0.5 leading-[1.5]">Click &quot;New Job&quot; to get AI-powered team recommendations based on location, availability, and reliability.</p>
        </div>
      </div>

      {/* Booking Wizard */}
      {bookingOpen && <BookingWizard cleaners={cleaners} customers={customers} jobs={jobs} />}
    </div>
  )
}
