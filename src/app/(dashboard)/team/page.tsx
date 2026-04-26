'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Star, CheckCircle, Shield, MapPin, TrendingUp, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CLEANERS, JOBS } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

const TEAM_NAMES: Record<string, string> = {
  'team-a': 'Team Alpha',
  'team-b': 'Team Beta',
  'team-c': 'Team Gamma',
  'team-d': 'Team Delta',
}

const TEAM_COLORS: Record<string, string> = {
  'team-a': '#8B85F2',
  'team-b': '#34D399',
  'team-c': '#FBBF24',
  'team-d': '#A78BFA',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  available:  { bg: 'rgba(52,211,153,0.14)',  text: '#34D399', dot: '#34D399', label: 'Available' },
  'en-route': { bg: 'rgba(251,191,36,0.14)',  text: '#FBBF24', dot: '#FBBF24', label: 'En Route' },
  cleaning:   { bg: 'rgba(139,133,242,0.15)', text: '#8B85F2', dot: '#8B85F2', label: 'Cleaning' },
  'off-duty': { bg: 'rgba(144,153,174,0.12)', text: '#9099AE', dot: '#535B70', label: 'Off Duty' },
}

const AI_INSIGHTS = [
  "Rosa + Miguel have 0 jobs today — consider routing them to cover Ashley's area (El Segundo)",
  'Team Alpha has the highest reliability score this month (94%) — great for premium clients',
  'Jennifer Kim has handled 3 move-out cleans this month — your top specialist for that service type',
]

export default function TeamPage() {
  const [_selectedCleaner, setSelectedCleaner] = useState<string | null>(null)

  const avgRating = (CLEANERS.reduce((s, c) => s + c.rating, 0) / CLEANERS.length).toFixed(1)
  const availableCount = CLEANERS.filter(c => c.status === 'available').length

  // Group cleaners by team
  const teams = ['team-a', 'team-b', 'team-c', 'team-d'].map(teamId => ({
    id: teamId,
    name: TEAM_NAMES[teamId],
    color: TEAM_COLORS[teamId],
    cleaners: CLEANERS.filter(c => c.teamId === teamId),
  }))

  // Calculate monthly pay per cleaner (35% of each completed job price)
  const getMonthlyPay = (cleanerId: string) => {
    const completedJobs = JOBS.filter(
      j => j.cleanerIds.includes(cleanerId) && j.status === 'completed'
    )
    return completedJobs.reduce((s, j) => s + j.price * 0.35, 0)
  }

  const stats = [
    { label: 'Total Cleaners', value: '8',                      icon: Users,        tint: 'var(--blue-500)' },
    { label: 'Available Now',  value: availableCount.toString(), icon: CheckCircle,  tint: 'var(--green-500)' },
    { label: 'Active Teams',   value: '4',                      icon: Shield,       tint: 'var(--violet-500)' },
    { label: 'Avg Rating',     value: `${avgRating}★`,          icon: Star,         tint: 'var(--amber-500)' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className="kpi-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-400)' }}>{s.label}</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${s.tint}22` }}>
                  <s.icon className="h-3.5 w-3.5" style={{ color: s.tint }} />
                </div>
              </div>
              <p className="tnum" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── AI Insights ───────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--blue-500)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-400)' }}>AI Team Insights</span>
        </div>
        <ul className="space-y-2">
          {AI_INSIGHTS.map((insight, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--blue-500)', fontSize: 13 }}>•</span>
              <span style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.5 }}>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="pay">Pay Calculator</TabsTrigger>
        </TabsList>

        {/* ── Teams Tab ──────────────────────────────────────── */}
        <TabsContent value="teams">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teams.map((team, i) => {
              const teamJobs = JOBS.filter(j =>
                team.cleaners.some(c => j.cleanerIds.includes(c.id))
              )
              const todayStr = new Date().toISOString().split('T')[0]
              const todayJobs = teamJobs.filter(j => j.scheduledDate === todayStr)
              const completedJobs = teamJobs.filter(j => j.status === 'completed')
              const teamRevenue = completedJobs.reduce((s, j) => s + j.price, 0)
              const avgTeamRating = (
                team.cleaners.reduce((s, c) => s + c.rating, 0) / team.cleaners.length
              ).toFixed(1)

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="transition-all duration-200" style={{ '--hover-border': 'var(--blue-200)' } as React.CSSProperties}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <CardTitle>{team.name}</CardTitle>
                        </div>
                        <Badge variant="neutral">{todayJobs.length} jobs today</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Cleaner pills */}
                      <div className="flex items-center gap-3">
                        {team.cleaners.map(cleaner => {
                          const sc = STATUS_COLORS[cleaner.status] ?? STATUS_COLORS['off-duty']
                          return (
                            <div
                              key={cleaner.id}
                              className="flex-1 flex items-center gap-2.5 p-3 cursor-pointer transition-colors duration-[120ms]"
                              style={{ borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--ink-200)' }}
                              onClick={() => setSelectedCleaner(cleaner.id)}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue-200)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-200)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)' }}
                            >
                              <div className="relative">
                                <Avatar initials={cleaner.initials} color={team.color} size="sm" />
                                <div
                                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: sc.dot, border: '2px solid var(--bg-soft)' }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-900)' }}>
                                  {cleaner.name.split(' ')[0]}
                                </p>
                                <span style={{ fontSize: 10, fontWeight: 600, color: sc.text }}>
                                  {sc.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Team stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg p-3" style={{ background: 'var(--bg-soft)' }}>
                          <p className="tnum font-bold" style={{ fontSize: 18, color: 'var(--ink-900)' }}>{completedJobs.length}</p>
                          <p style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>Jobs Done</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: 'var(--bg-soft)' }}>
                          <p className="tnum font-bold" style={{ fontSize: 18, color: 'var(--green-500)' }}>{formatCurrency(teamRevenue)}</p>
                          <p style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>Revenue</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: 'var(--bg-soft)' }}>
                          <p className="tnum font-bold" style={{ fontSize: 18, color: 'var(--amber-500)' }}>{avgTeamRating}★</p>
                          <p style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>Rating</p>
                        </div>
                      </div>

                      {/* Home area */}
                      <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                        <MapPin className="h-3 w-3" />
                        <span>Based in {team.cleaners[0]?.homeAreaName}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Individual Tab ─────────────────────────────────── */}
        <TabsContent value="individual">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CLEANERS.map((cleaner, i) => {
              const sc = STATUS_COLORS[cleaner.status] ?? STATUS_COLORS['off-duty']
              const monthPay = getMonthlyPay(cleaner.id)
              const completedCount = JOBS.filter(
                j => j.cleanerIds.includes(cleaner.id) && j.status === 'completed'
              ).length

              return (
                <motion.div
                  key={cleaner.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="transition-all">
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={cleaner.initials} color={cleaner.color} size="md" />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{cleaner.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 1 }}>{TEAM_NAMES[cleaner.teamId]}</p>
                          </div>
                        </div>
                        <span
                          style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: sc.bg, color: sc.text }}
                        >
                          {sc.label}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--ink-400)' }}>Rating</span>
                          <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>⭐ {cleaner.rating}</span>
                        </div>
                        <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--ink-400)' }}>Reliability</span>
                          <span style={{ color: 'var(--green-500)', fontWeight: 600 }}>{cleaner.reliabilityScore}%</span>
                        </div>
                        <Progress value={cleaner.reliabilityScore} color="var(--green-500)" />
                        <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--ink-400)' }}>Total Jobs</span>
                          <span style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{cleaner.totalJobs}</span>
                        </div>
                        <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--ink-400)' }}>Completed (mo.)</span>
                          <span style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{completedCount}</span>
                        </div>
                        <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--ink-400)' }}>This Month Pay</span>
                          <span className="tnum font-bold" style={{ color: 'var(--blue-400)' }}>{formatCurrency(monthPay)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1" style={{ fontSize: 10, color: 'var(--ink-400)' }}>
                          <MapPin className="h-3 w-3" />
                          {cleaner.homeAreaName}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cleaner.specialties.map(s => (
                            <span
                              key={s}
                              style={{ fontSize: 9, background: 'var(--bg-soft)', border: '1px solid var(--ink-200)', color: 'var(--ink-500)', borderRadius: 4, padding: '2px 6px' }}
                              className="capitalize"
                            >
                              {s.replace('-', ' ')}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(d => (
                            <div
                              key={d}
                              className="flex-1 text-center rounded py-0.5"
                              style={{
                                fontSize: 8,
                                background: cleaner.availableHours[d] ? 'var(--blue-50)' : 'var(--bg-elev)',
                                color: cleaner.availableHours[d] ? 'var(--blue-400)' : 'var(--ink-300)',
                              }}
                            >
                              {d[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Pay Calculator Tab ─────────────────────────────── */}
        <TabsContent value="pay">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color: 'var(--blue-400)' }} />
                  <CardTitle>Monthly Pay Calculator</CardTitle>
                </div>
                <Badge variant="neutral">April 2026</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-6 gap-3 px-3 py-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-400)' }}>
                  <div className="col-span-2">Cleaner</div>
                  <div>Jobs Done</div>
                  <div>Job Revenue</div>
                  <div>Pay Rate</div>
                  <div>Est. Pay</div>
                </div>

                {CLEANERS.map(cleaner => {
                  const completedJobs = JOBS.filter(j => j.cleanerIds.includes(cleaner.id) && j.status === 'completed')
                  const jobRevenue = completedJobs.reduce((s, j) => s + j.price, 0)
                  const pay = getMonthlyPay(cleaner.id)
                  return (
                    <div
                      key={cleaner.id}
                      className="grid grid-cols-6 gap-3 items-center px-3 py-3 transition-colors duration-[120ms]"
                      style={{ borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--ink-200)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue-200)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-200)' }}
                    >
                      <div className="col-span-2 flex items-center gap-2.5">
                        <Avatar initials={cleaner.initials} color={cleaner.color} size="sm" />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{cleaner.name}</p>
                          <p style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 1 }}>{TEAM_NAMES[cleaner.teamId]}</p>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{completedJobs.length}</div>
                      <div className="tnum" style={{ fontSize: 13, color: 'var(--ink-500)' }}>{formatCurrency(jobRevenue)}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-400)' }}>35%</div>
                      <div className="tnum font-bold" style={{ fontSize: 13, color: 'var(--green-500)' }}>{formatCurrency(pay)}</div>
                    </div>
                  )
                })}

                {/* Total row */}
                <div className="grid grid-cols-6 gap-3 items-center px-3 py-3 mt-1" style={{ borderRadius: 8, background: 'var(--blue-50)', border: '1px solid var(--blue-100)' }}>
                  <div className="col-span-2" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>Total Payroll</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{JOBS.filter(j => j.status === 'completed').length}</div>
                  <div className="tnum" style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                    {formatCurrency(JOBS.filter(j => j.status === 'completed').reduce((s, j) => s + j.price, 0))}
                  </div>
                  <div style={{ color: 'var(--ink-400)', fontSize: 13 }}>—</div>
                  <div className="tnum font-bold" style={{ fontSize: 13, color: 'var(--blue-400)' }}>
                    {formatCurrency(CLEANERS.reduce((s, c) => s + getMonthlyPay(c.id), 0))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
