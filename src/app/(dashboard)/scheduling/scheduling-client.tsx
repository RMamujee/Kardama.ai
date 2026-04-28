'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { useSchedulingStore } from '@/store/useSchedulingStore'
import { formatTime, getServiceLabel, cn, formatCurrency } from '@/lib/utils'
import { BookingWizard } from '@/components/scheduling/BookingWizard'
import type { Cleaner, Customer, Job } from '@/types'

type SchedulingData = {
  cleaners: Cleaner[]
  customers: Customer[]
  jobs: Job[]
}

const SERVICE_COLORS: Record<string, string> = {
  standard:           'bg-mint-500/12 text-mint-500 border-mint-500/25',
  deep:               'bg-mint-500/12 text-mint-500 border-mint-500/25',
  'move-out':         'bg-amber-500/12 text-amber-500 border-amber-500/25',
  'post-construction':'bg-rose-500/12 text-rose-500 border-rose-500/25',
  airbnb:             'bg-emerald-500/12 text-emerald-500 border-emerald-500/25',
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7) // 7am to 5pm

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

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function SchedulingClient({ cleaners, jobs }: SchedulingData) {
  const { weekOffset, setWeekOffset, openBooking, bookingOpen } = useSchedulingStore()
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const jobsByDay = useMemo(() => {
    const map: Record<string, Job[]> = {}
    weekDates.forEach(d => { map[fmtDate(d)] = [] })
    jobs.forEach(j => {
      if (map[j.scheduledDate]) map[j.scheduledDate].push(j)
    })
    return map
  }, [jobs, weekDates])

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = fmtDate(new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[13px] font-medium text-ink-700">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
          )}
        </div>
        <Button onClick={openBooking}>
          <Plus className="h-[15px] w-[15px]" strokeWidth={2.5} /> New Job
        </Button>
      </div>

      {/* Week Calendar */}
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
                              onClick={() => setSelectedJob(job)}
                              className={cn(
                                'w-full rounded-[8px] border p-2 text-left text-[12px]',
                                tone,
                              )}
                            >
                              <p className="font-medium truncate">{job.address.split(',')[0]}</p>
                              <p className="opacity-75 mt-0.5 text-[11px]">{formatTime(job.scheduledTime)} · {jobCleaners.map(c=>c.initials).join('+')}</p>
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

      {/* Job Detail Panel */}
      {selectedJob && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">Job Details</h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-[12px] text-ink-400 hover:text-ink-700 bg-transparent border-0 cursor-pointer transition-colors"
              >Close</button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[12px] font-medium text-ink-500 mb-1.5">Address</p>
                  <p className="text-[13px] font-medium text-ink-900">{selectedJob.address}</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-ink-500 mb-1.5">Service</p>
                  <p className="text-[13px] font-medium text-ink-900">{getServiceLabel(selectedJob.serviceType)}</p>
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
                  <p className="text-[12px] font-medium text-ink-500 mb-2">Team</p>
                  <div className="flex gap-3 flex-wrap">
                    {cleaners.filter(c => selectedJob.cleanerIds.includes(c.id)).map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <Avatar initials={c.initials} color={c.color} size="sm" />
                        <span className="text-[13px] font-medium text-ink-900">{c.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-ink-500 mb-2">Status</p>
                  <Badge variant="default">{selectedJob.status}</Badge>
                </div>
              </div>
            </div>
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
      {bookingOpen && <BookingWizard />}
    </div>
  )
}
