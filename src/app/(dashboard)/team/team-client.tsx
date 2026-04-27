'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Star, CheckCircle, Shield, MapPin, TrendingUp, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatTile } from '@/components/ui/stat-tile'
import { formatCurrency } from '@/lib/utils'
import type { Cleaner, Job } from '@/types'
import { InviteCleanerForm } from './invite-form'

type TeamData = { cleaners: Cleaner[]; jobs: Job[] }

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

type StatusKey = 'available' | 'en-route' | 'cleaning' | 'off-duty'

const STATUS_PILL: Record<StatusKey, { pill: string; text: string; label: string; dot: string }> = {
  available:  { pill: 'bg-emerald-500/15 text-emerald-500', text: 'text-emerald-500', label: 'Available', dot: 'bg-emerald-500' },
  'en-route': { pill: 'bg-amber-500/15 text-amber-500',     text: 'text-amber-500',   label: 'En Route',  dot: 'bg-amber-500' },
  cleaning:   { pill: 'bg-violet-500/15 text-violet-400',   text: 'text-violet-400',  label: 'Cleaning',  dot: 'bg-violet-500' },
  'off-duty': { pill: 'bg-ink-500/15 text-ink-500',         text: 'text-ink-500',     label: 'Off Duty',  dot: 'bg-ink-300' },
}

const AI_INSIGHTS = [
  "Rosa + Miguel have 0 jobs today — consider routing them to cover Ashley's area (El Segundo)",
  'Team Alpha has the highest reliability score this month (94%) — great for premium clients',
  'Jennifer Kim has handled 3 move-out cleans this month — your top specialist for that service type',
]

export function TeamClient({ cleaners, jobs }: TeamData) {
  const [_selectedCleaner, setSelectedCleaner] = useState<string | null>(null)

  const avgRating = cleaners.length
    ? (cleaners.reduce((s, c) => s + c.rating, 0) / cleaners.length).toFixed(1)
    : '0.0'
  const availableCount = cleaners.filter(c => c.status === 'available').length

  // Group cleaners by team
  const teams = ['team-a', 'team-b', 'team-c', 'team-d'].map(teamId => ({
    id: teamId,
    name: TEAM_NAMES[teamId],
    color: TEAM_COLORS[teamId],
    cleaners: cleaners.filter(c => c.teamId === teamId),
  }))

  // Calculate monthly pay per cleaner (35% of each completed job price)
  const getMonthlyPay = (cleanerId: string) => {
    const completedJobs = jobs.filter(
      j => j.cleanerIds.includes(cleanerId) && j.status === 'completed'
    )
    return completedJobs.reduce((s, j) => s + j.price * 0.35, 0)
  }

  const stats = [
    { label: 'Total Cleaners', value: cleaners.length.toString(),                                       icon: Users,       tone: 'violet'  as const },
    { label: 'Available Now',  value: availableCount.toString(),                                       icon: CheckCircle, tone: 'emerald' as const },
    { label: 'Active Teams',   value: teams.filter(t => t.cleaners.length).length.toString(),         icon: Shield,      tone: 'purple'  as const },
    { label: 'Avg Rating',     value: `${avgRating}★`,                                                 icon: Star,        tone: 'amber'   as const },
  ]

  return (
    <div className="space-y-7 max-w-7xl">
      <InviteCleanerForm />

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <StatTile label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
          </motion.div>
        ))}
      </div>

      {/* ── AI Insights ───────────────────────────────────────── */}
      <div className="rounded-xl p-5 bg-violet-500/10 border border-violet-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-violet-400">AI Team Insights</span>
        </div>
        <ul className="space-y-2.5">
          {AI_INSIGHTS.map((insight, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 text-violet-500 text-[13px]">•</span>
              <span className="text-[13px] text-ink-500 leading-[1.55]">{insight}</span>
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
              const teamJobs = jobs.filter(j =>
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
                  <Card>
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
                          const sp = STATUS_PILL[cleaner.status as StatusKey] ?? STATUS_PILL['off-duty']
                          return (
                            <button
                              key={cleaner.id}
                              type="button"
                              className="flex-1 flex items-center gap-2.5 p-3 rounded-lg bg-soft border border-ink-200 cursor-pointer transition-colors duration-150 hover:bg-hover hover:border-violet-200 text-left"
                              onClick={() => setSelectedCleaner(cleaner.id)}
                            >
                              <div className="relative">
                                <Avatar initials={cleaner.initials} color={team.color} size="sm" />
                                <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-soft ${sp.dot}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-ink-900">
                                  {cleaner.name.split(' ')[0]}
                                </p>
                                <span className={`text-[11px] font-semibold ${sp.text}`}>
                                  {sp.label}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Team stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg p-3 bg-soft">
                          <p className="tnum text-[18px] font-bold tracking-[-0.01em] text-ink-900">{completedJobs.length}</p>
                          <p className="text-[11px] text-ink-400 mt-0.5">Jobs Done</p>
                        </div>
                        <div className="rounded-lg p-3 bg-soft">
                          <p className="tnum text-[18px] font-bold tracking-[-0.01em] text-emerald-500">{formatCurrency(teamRevenue)}</p>
                          <p className="text-[11px] text-ink-400 mt-0.5">Revenue</p>
                        </div>
                        <div className="rounded-lg p-3 bg-soft">
                          <p className="tnum text-[18px] font-bold tracking-[-0.01em] text-amber-500">{avgTeamRating}★</p>
                          <p className="text-[11px] text-ink-400 mt-0.5">Rating</p>
                        </div>
                      </div>

                      {/* Home area */}
                      <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
                        <MapPin className="h-3.5 w-3.5" />
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
            {cleaners.map((cleaner, i) => {
              const sp = STATUS_PILL[cleaner.status as StatusKey] ?? STATUS_PILL['off-duty']
              const monthPay = getMonthlyPay(cleaner.id)
              const completedCount = jobs.filter(
                j => j.cleanerIds.includes(cleaner.id) && j.status === 'completed'
              ).length

              return (
                <motion.div
                  key={cleaner.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar initials={cleaner.initials} color={cleaner.color} size="md" />
                          <div>
                            <p className="text-[13px] font-semibold text-ink-900">{cleaner.name}</p>
                            <p className="text-[12px] text-ink-400 mt-0.5">{TEAM_NAMES[cleaner.teamId]}</p>
                          </div>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${sp.pill}`}>
                          {sp.label}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-ink-400">Rating</span>
                          <span className="text-amber-500 font-semibold">⭐ {cleaner.rating}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-ink-400">Reliability</span>
                          <span className="tnum text-emerald-500 font-semibold">{cleaner.reliabilityScore}%</span>
                        </div>
                        <Progress value={cleaner.reliabilityScore} color="var(--green-500)" />
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-ink-400">Total Jobs</span>
                          <span className="tnum text-ink-700 font-semibold">{cleaner.totalJobs}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-ink-400">Completed (mo.)</span>
                          <span className="tnum text-ink-700 font-semibold">{completedCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-ink-400">This Month Pay</span>
                          <span className="tnum font-bold text-violet-400">{formatCurrency(monthPay)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-ink-400">
                          <MapPin className="h-3 w-3" />
                          {cleaner.homeAreaName}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cleaner.specialties.map(s => (
                            <span
                              key={s}
                              className="capitalize text-[11px] bg-soft border border-ink-200 text-ink-500 rounded px-1.5 py-0.5"
                            >
                              {s.replace('-', ' ')}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(d => (
                            <div
                              key={d}
                              className={`flex-1 text-center rounded py-1 text-[11px] font-semibold ${
                                cleaner.availableHours[d]
                                  ? 'bg-violet-500/10 text-violet-400'
                                  : 'bg-elev text-ink-300'
                              }`}
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
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                  <CardTitle>Monthly Pay Calculator</CardTitle>
                </div>
                <Badge variant="neutral">April 2026</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-6 gap-3 px-3 py-2.5 text-[11px] font-bold tracking-[0.09em] uppercase text-ink-400">
                  <div className="col-span-2">Cleaner</div>
                  <div>Jobs Done</div>
                  <div>Job Revenue</div>
                  <div>Pay Rate</div>
                  <div>Est. Pay</div>
                </div>

                {cleaners.map(cleaner => {
                  const completedJobs = jobs.filter(j => j.cleanerIds.includes(cleaner.id) && j.status === 'completed')
                  const jobRevenue = completedJobs.reduce((s, j) => s + j.price, 0)
                  const pay = getMonthlyPay(cleaner.id)
                  return (
                    <div
                      key={cleaner.id}
                      className="grid grid-cols-6 gap-3 items-center px-3 py-3.5 rounded-lg bg-soft border border-ink-200 transition-colors duration-150 hover:border-violet-200"
                    >
                      <div className="col-span-2 flex items-center gap-2.5">
                        <Avatar initials={cleaner.initials} color={cleaner.color} size="sm" />
                        <div>
                          <p className="text-[13px] font-semibold text-ink-900">{cleaner.name}</p>
                          <p className="text-[11px] text-ink-400 mt-0.5">{TEAM_NAMES[cleaner.teamId]}</p>
                        </div>
                      </div>
                      <div className="tnum text-[13px] font-semibold text-ink-700">{completedJobs.length}</div>
                      <div className="tnum text-[13px] text-ink-500">{formatCurrency(jobRevenue)}</div>
                      <div className="tnum text-[13px] text-ink-400">35%</div>
                      <div className="tnum text-[13px] font-bold text-emerald-500">{formatCurrency(pay)}</div>
                    </div>
                  )
                })}

                {/* Total row */}
                <div className="grid grid-cols-6 gap-3 items-center px-3 py-3.5 mt-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="col-span-2 text-[13px] font-bold text-ink-900">Total Payroll</div>
                  <div className="tnum text-[13px] font-semibold text-ink-700">{jobs.filter(j => j.status === 'completed').length}</div>
                  <div className="tnum text-[13px] text-ink-500">
                    {formatCurrency(jobs.filter(j => j.status === 'completed').reduce((s, j) => s + j.price, 0))}
                  </div>
                  <div className="text-[13px] text-ink-400">—</div>
                  <div className="tnum text-[13px] font-bold text-violet-400">
                    {formatCurrency(cleaners.reduce((s, c) => s + getMonthlyPay(c.id), 0))}
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
