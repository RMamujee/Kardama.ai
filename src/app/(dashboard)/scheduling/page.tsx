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
  standard: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30',
  deep: 'bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30',
  'move-out': 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30',
  'post-construction': 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
  airbnb: 'bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/30',
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-400">
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
      <Card className="bg-[#0d1321] border-[#1e2a3a]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <div className="min-w-[560px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-[#1e2a3a]">
            <div className="border-r border-[#1e2a3a] p-3 text-xs text-slate-600" />
            {weekDates.map((d, i) => {
              const dateStr = fmtDate(d)
              const isToday = dateStr === today
              return (
                <div key={i} className={cn('p-3 text-center border-r border-[#1e2a3a] last:border-r-0', isToday && 'bg-indigo-500/[0.05]')}>
                  <p className={cn('text-xs font-medium', isToday ? 'text-indigo-400' : 'text-slate-500')}>{DAY_LABELS[i]}</p>
                  <p className={cn('text-lg font-semibold mt-0.5', isToday ? 'text-indigo-300' : 'text-slate-200')}>{d.getDate()}</p>
                  {jobsByDay[dateStr]?.length > 0 && (
                    <div className="mt-1 flex justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          <div className="max-h-[500px] overflow-y-auto">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-[#1e2a3a] min-h-[60px]">
                <div className="border-r border-[#1e2a3a] px-3 py-2 text-xs text-slate-600 font-mono">
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
                    <div key={di} className={cn('border-r border-[#1e2a3a] last:border-r-0 p-1 space-y-1', isToday && 'bg-indigo-500/[0.03]')}>
                      {dayJobs.map(job => {
                        const cleaners = CLEANERS.filter(c => job.cleanerIds.includes(c.id))
                        return (
                          <button
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className={cn(
                              'w-full rounded-md border p-1.5 text-left text-xs transition-all',
                              SERVICE_COLORS[job.serviceType] || SERVICE_COLORS.standard
                            )}
                          >
                            <p className="font-semibold truncate">{job.address.split(',')[0]}</p>
                            <p className="text-[10px] opacity-75">{formatTime(job.scheduledTime)} · {cleaners.map(c=>c.initials).join('+')}</p>
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
          <Card className="bg-[#111827] border-[#1e2a3a]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Details</CardTitle>
                <button onClick={() => setSelectedJob(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Close</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Address</p>
                  <p className="font-medium text-slate-200">{selectedJob.address}</p>
                </div>
                <div>
                  <p className="text-slate-500">Service</p>
                  <p className="font-medium text-slate-200">{getServiceLabel(selectedJob.serviceType)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Time</p>
                  <p className="font-medium text-slate-200">{formatTime(selectedJob.scheduledTime)} · {selectedJob.estimatedDuration} min</p>
                </div>
                <div>
                  <p className="text-slate-500">Price</p>
                  <p className="font-medium text-emerald-400">{formatCurrency(selectedJob.price)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Team</p>
                  <div className="flex gap-2 mt-1">
                    {CLEANERS.filter(c => selectedJob.cleanerIds.includes(c.id)).map(c => (
                      <div key={c.id} className="flex items-center gap-1.5">
                        <Avatar initials={c.initials} color={c.color} size="sm" />
                        <span className="text-xs font-medium text-slate-300">{c.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge variant="default" className="mt-1 capitalize">{selectedJob.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Info Banner */}
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20">
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">AI Scheduling Active</p>
          <p className="text-xs text-slate-500">Click &quot;New Job&quot; to get AI-powered team recommendations based on location, availability, and reliability.</p>
        </div>
      </div>

      {/* Booking Wizard */}
      {bookingOpen && <BookingWizard />}
    </div>
  )
}
