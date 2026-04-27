'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { useSchedulingStore } from '@/store/useSchedulingStore'
import { CLEANERS, CUSTOMERS } from '@/lib/mock-data'
import { formatTime, getServiceLabel, cn, formatCurrency } from '@/lib/utils'
import { BookingWizard } from '@/components/scheduling/BookingWizard'
import { Job } from '@/types'

const SERVICE_COLORS: Record<string, string> = {
  standard:           'bg-violet-500/15 text-violet-500 border-violet-500/30',
  deep:               'bg-purple-500/15 text-purple-500 border-purple-500/30',
  'move-out':         'bg-pink-500/15 text-pink-500 border-pink-500/30',
  'post-construction':'bg-rose-500/15 text-rose-500 border-rose-500/30',
  airbnb:             'bg-teal-500/15 text-teal-500 border-teal-500/30',
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

export default function SchedulingPage() {
  const { jobs, weekOffset, setWeekOffset, openBooking, bookingOpen } = useSchedulingStore()
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
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[13px] font-medium text-ink-500">
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
          <Plus className="h-4 w-4" /> New Job
        </Button>
      </div>

      {/* Week Calendar */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <div className="min-w-[560px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-ink-200">
            <div className="p-3 border-r border-ink-200" />
            {weekDates.map((d, i) => {
              const dateStr = fmtDate(d)
              const isToday = dateStr === today
              return (
                <div
                  key={i}
                  className={cn(
                    'p-3 text-center',
                    i < 6 && 'border-r border-ink-200',
                    isToday && 'bg-violet-500/10'
                  )}
                >
                  <p className={cn(
                    'text-[11px] font-bold uppercase tracking-[0.09em]',
                    isToday ? 'text-violet-400' : 'text-ink-400'
                  )}>{DAY_LABELS[i]}</p>
                  <p className={cn(
                    'tnum text-[18px] font-bold mt-[3px] tracking-[-0.02em]',
                    isToday ? 'text-violet-400' : 'text-ink-700'
                  )}>{d.getDate()}</p>
                  {jobsByDay[dateStr]?.length > 0 && (
                    <div className="mt-1 flex justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          <div className="max-h-[500px] overflow-y-auto">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-ink-200 min-h-[64px]">
                <div className="px-3 py-2.5 font-mono tnum border-r border-ink-200 text-[12px] text-ink-300">
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
                        di < 6 && 'border-r border-ink-200',
                        isToday && 'bg-violet-500/[0.03]'
                      )}
                    >
                      {dayJobs.map(job => {
                        const cleaners = CLEANERS.filter(c => job.cleanerIds.includes(c.id))
                        const tone = SERVICE_COLORS[job.serviceType] ?? SERVICE_COLORS.standard
                        return (
                          <button
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className={cn(
                              'w-full rounded-md border p-2 text-left text-[12px]',
                              tone
                            )}
                          >
                            <p className="font-semibold truncate">{job.address.split(',')[0]}</p>
                            <p className="opacity-75 mt-0.5 text-[11px]">{formatTime(job.scheduledTime)} · {cleaners.map(c=>c.initials).join('+')}</p>
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
        </CardContent>
      </Card>

      {/* Job Detail Panel */}
      {selectedJob && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Details</CardTitle>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-[12px] text-ink-400 hover:text-ink-700 bg-transparent border-0 cursor-pointer transition-colors"
                >Close</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400 mb-1.5">Address</p>
                  <p className="text-[13px] font-semibold text-ink-700">{selectedJob.address}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400 mb-1.5">Service</p>
                  <p className="text-[13px] font-semibold text-ink-700">{getServiceLabel(selectedJob.serviceType)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400 mb-1.5">Time</p>
                  <p className="text-[13px] font-semibold text-ink-700">{formatTime(selectedJob.scheduledTime)} · {selectedJob.estimatedDuration} min</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400 mb-1.5">Price</p>
                  <p className="tnum text-[13px] font-bold text-emerald-500">{formatCurrency(selectedJob.price)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400 mb-2">Team</p>
                  <div className="flex gap-3 flex-wrap">
                    {CLEANERS.filter(c => selectedJob.cleanerIds.includes(c.id)).map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <Avatar initials={c.initials} color={c.color} size="sm" />
                        <span className="text-[13px] font-semibold text-ink-700">{c.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400 mb-2">Status</p>
                  <Badge variant="default" className="capitalize">{selectedJob.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Info Banner */}
      <div className="flex items-center gap-3 rounded-xl p-4 bg-violet-500/10 border border-violet-500/20">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 bg-violet-500/15">
          <Sparkles className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink-700">AI Scheduling Active</p>
          <p className="text-[12px] text-ink-400 mt-[3px] leading-[1.5]">Click &quot;New Job&quot; to get AI-powered team recommendations based on location, availability, and reliability.</p>
        </div>
      </div>

      {/* Booking Wizard */}
      {bookingOpen && <BookingWizard />}
    </div>
  )
}
