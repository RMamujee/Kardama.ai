'use client'
import { useState, useMemo, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Plus, Sparkles, Inbox, CheckCircle2, XCircle, Clock, Pencil, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { useSchedulingStore } from '@/store/useSchedulingStore'
import { formatTime, getServiceLabel, cn, formatCurrency } from '@/lib/utils'
import { BookingWizard } from '@/components/scheduling/BookingWizard'
import { acceptBookingRequest, declineBookingRequest, updateJob, deleteJob } from '@/app/actions/scheduling'
import type { Cleaner, Customer, Job } from '@/types'
import type { BookingRequest } from '@/lib/data'

type SchedulingData = {
  cleaners: Cleaner[]
  customers: Customer[]
  jobs: Job[]
  bookingRequests: BookingRequest[]
}

const SERVICE_COLORS: Record<string, string> = {
  standard:           'bg-mint-500/12 text-mint-500 border-mint-500/25',
  deep:               'bg-mint-500/12 text-mint-500 border-mint-500/25',
  'move-out':         'bg-amber-500/12 text-amber-500 border-amber-500/25',
  'post-construction':'bg-rose-500/12 text-rose-500 border-rose-500/25',
  airbnb:             'bg-emerald-500/12 text-emerald-500 border-emerald-500/25',
}

const SERVICE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep Clean' },
  { value: 'move-out', label: 'Move-Out' },
  { value: 'post-construction', label: 'Post-Construction' },
  { value: 'airbnb', label: 'Airbnb' },
]

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

export function SchedulingClient({ cleaners, customers, jobs, bookingRequests }: SchedulingData) {
  const { weekOffset, setWeekOffset, openBooking, bookingOpen } = useSchedulingStore()
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
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

  const jobsByDay = useMemo(() => {
    const map: Record<string, Job[]> = {}
    weekDates.forEach(d => { map[fmtDate(d)] = [] })
    jobs.forEach(j => {
      if (map[j.scheduledDate]) map[j.scheduledDate].push(j)
    })
    return map
  }, [jobs, weekDates])

  const currentMonthDate = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  }, [monthOffset])

  const monthDates = useMemo(() => getMonthCalendarDates(monthOffset), [monthOffset])
  const monthJobsByDay = useMemo(() => {
    const map: Record<string, Job[]> = {}
    monthDates.forEach(d => { map[fmtDate(d)] = [] })
    jobs.forEach(j => { if (map[j.scheduledDate] !== undefined) map[j.scheduledDate].push(j) })
    return map
  }, [jobs, monthDates])

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

  function handleAccept(id: string) {
    setActionTarget(id)
    setAcceptError(null)
    startTransition(async () => {
      try {
        await acceptBookingRequest(id)
      } catch (e) {
        setAcceptError(e instanceof Error ? e.message : 'Failed to schedule booking')
      } finally {
        setActionTarget(null)
      }
    })
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
    startTransition(async () => {
      await updateJob(selectedJob.id, draft)
      setEditMode(false)
      setDraft(null)
      setIsSaving(false)
      setSelectedJob(null)
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
    setEditMode(false)
    setDraft(null)
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
                view === 'week' ? 'bg-mint-500 text-black' : 'text-ink-500 hover:text-ink-700',
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium border-l border-line transition-colors',
                view === 'month' ? 'bg-mint-500 text-black' : 'text-ink-500 hover:text-ink-700',
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
              return (
                <div key={req.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4">
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
                    <button
                      onClick={() => handleDecline(req.id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:border-rose-500/40 hover:text-rose-500 disabled:opacity-40 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-mint-500/12 border border-mint-500/25 px-3 py-1.5 text-[12px] font-medium text-mint-500 hover:bg-mint-500/20 disabled:opacity-40 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {busy ? 'Scheduling…' : 'Schedule'}
                    </button>
                  </div>
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
                        isToday ? 'bg-mint-500 text-black' : 'text-ink-700',
                      )}>
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {dayJobs.slice(0, 3).map(job => {
                        const tone = SERVICE_COLORS[job.serviceType] ?? SERVICE_COLORS.standard
                        return (
                          <button
                            key={job.id}
                            onClick={() => selectJob(job)}
                            className={cn(
                              'w-full text-left rounded-[4px] border px-1.5 py-[2px] text-[10.5px] font-medium truncate leading-[1.4]',
                              tone,
                              selectedJob?.id === job.id && 'ring-1 ring-mint-500',
                            )}
                          >
                            {formatTime(job.scheduledTime)} · {job.address.split(',')[0]}
                          </button>
                        )
                      })}
                      {dayJobs.length > 3 && (
                        <p className="text-[10px] text-ink-400 pl-1">+{dayJobs.length - 3} more</p>
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
                            const tone = SERVICE_COLORS[job.serviceType] ?? SERVICE_COLORS.standard
                            return (
                              <button
                                key={job.id}
                                onClick={() => selectJob(job)}
                                className={cn(
                                  'w-full rounded-[8px] border p-2 text-left text-[12px]',
                                  tone,
                                  selectedJob?.id === job.id && 'ring-2 ring-offset-1 ring-mint-500/50',
                                )}
                              >
                                <p className="font-medium truncate">{job.address.split(',')[0]}</p>
                                <p className="opacity-75 mt-0.5 text-[11px]">
                                  {formatTime(job.scheduledTime)}
                                  {jobCleaners.length > 0 && ` · ${jobCleaners.map(c => c.initials).join('+')}`}
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
                    <div className="flex gap-3 flex-wrap">
                      {cleaners.filter(c => selectedJob.cleanerIds.includes(c.id)).length > 0
                        ? cleaners.filter(c => selectedJob.cleanerIds.includes(c.id)).map(c => (
                            <div key={c.id} className="flex items-center gap-2">
                              <Avatar initials={c.initials} color={c.color} size="sm" />
                              <span className="text-[13px] font-medium text-ink-900">{c.name.split(' ')[0]}</span>
                            </div>
                          ))
                        : <p className="text-[12px] text-ink-400">Unassigned</p>
                      }
                    </div>
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
                            {c.name.split(' ')[0]}
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
      {bookingOpen && <BookingWizard cleaners={cleaners} customers={customers} />}
    </div>
  )
}
