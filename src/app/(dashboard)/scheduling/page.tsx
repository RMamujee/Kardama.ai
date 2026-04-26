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

const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  standard:           { bg: 'rgba(139,133,242,0.18)', text: '#8B85F2', border: 'rgba(139,133,242,0.3)' },
  deep:               { bg: 'rgba(167,139,250,0.18)', text: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  'move-out':         { bg: 'rgba(244,114,182,0.18)', text: '#F472B6', border: 'rgba(244,114,182,0.3)' },
  'post-construction':{ bg: 'rgba(248,113,113,0.18)', text: '#F87171', border: 'rgba(248,113,113,0.3)' },
  airbnb:             { bg: 'rgba(45,212,191,0.18)',  text: '#2DD4BF', border: 'rgba(45,212,191,0.3)'  },
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
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-500)' }}>
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
          <div className="grid grid-cols-8" style={{ borderBottom: '1px solid var(--ink-200)' }}>
            <div className="p-3" style={{ borderRight: '1px solid var(--ink-200)' }} />
            {weekDates.map((d, i) => {
              const dateStr = fmtDate(d)
              const isToday = dateStr === today
              return (
                <div
                  key={i}
                  className="p-3 text-center"
                  style={{
                    borderRight: i < 6 ? '1px solid var(--ink-200)' : 'none',
                    background: isToday ? 'var(--blue-50)' : 'transparent',
                  }}
                >
                  <p style={{ fontSize: 11, fontWeight: 600, color: isToday ? 'var(--blue-400)' : 'var(--ink-400)' }}>{DAY_LABELS[i]}</p>
                  <p style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: isToday ? 'var(--blue-400)' : 'var(--ink-700)' }}>{d.getDate()}</p>
                  {jobsByDay[dateStr]?.length > 0 && (
                    <div className="mt-1 flex justify-center">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--blue-500)' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          <div className="max-h-[500px] overflow-y-auto">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8" style={{ borderBottom: '1px solid var(--ink-200)', minHeight: 60 }}>
                <div className="px-3 py-2 font-mono" style={{ borderRight: '1px solid var(--ink-200)', fontSize: 11, color: 'var(--ink-300)' }}>
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
                      className="p-1 space-y-1"
                      style={{
                        borderRight: di < 6 ? '1px solid var(--ink-200)' : 'none',
                        background: isToday ? 'rgba(139,133,242,0.03)' : 'transparent',
                      }}
                    >
                      {dayJobs.map(job => {
                        const cleaners = CLEANERS.filter(c => job.cleanerIds.includes(c.id))
                        return (
                          <button
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="w-full rounded-md border p-1.5 text-left text-xs transition-all"
                            style={(() => {
                              const sc = SERVICE_COLORS[job.serviceType] ?? SERVICE_COLORS.standard
                              return { background: sc.bg, color: sc.text, borderColor: sc.border }
                            })()}
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Details</CardTitle>
                <button
                  onClick={() => setSelectedJob(null)}
                  style={{ fontSize: 12, color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 120ms' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-700)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-400)' }}
                >Close</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginBottom: 3 }}>Address</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{selectedJob.address}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginBottom: 3 }}>Service</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{getServiceLabel(selectedJob.serviceType)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginBottom: 3 }}>Time</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{formatTime(selectedJob.scheduledTime)} · {selectedJob.estimatedDuration} min</p>
                </div>
                <div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginBottom: 3 }}>Price</p>
                  <p className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-500)' }}>{formatCurrency(selectedJob.price)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginBottom: 6 }}>Team</p>
                  <div className="flex gap-2">
                    {CLEANERS.filter(c => selectedJob.cleanerIds.includes(c.id)).map(c => (
                      <div key={c.id} className="flex items-center gap-1.5">
                        <Avatar initials={c.initials} color={c.color} size="sm" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-600)' }}>{c.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginBottom: 6 }}>Status</p>
                  <Badge variant="default" className="capitalize">{selectedJob.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Info Banner */}
      <div
        className="flex items-center gap-3 rounded-xl p-4"
        style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)' }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(139,133,242,0.18)' }}>
          <Sparkles className="h-4 w-4" style={{ color: 'var(--blue-400)' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>AI Scheduling Active</p>
          <p style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>Click &quot;New Job&quot; to get AI-powered team recommendations based on location, availability, and reliability.</p>
        </div>
      </div>

      {/* Booking Wizard */}
      {bookingOpen && <BookingWizard />}
    </div>
  )
}
