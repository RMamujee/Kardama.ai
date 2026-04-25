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
  'team-a': '#6366f1',
  'team-b': '#10b981',
  'team-c': '#f59e0b',
  'team-d': '#8b5cf6',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  available:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: '#10b981', label: 'Available' },
  'en-route': { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: '#f59e0b', label: 'En Route' },
  cleaning:   { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  dot: '#6366f1', label: 'Cleaning' },
  'off-duty': { bg: 'bg-slate-800',      text: 'text-slate-500',   dot: '#374151', label: 'Off Duty' },
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
    { label: 'Total Cleaners', value: '8',                    icon: Users,        color: 'text-indigo-400' },
    { label: 'Available Now',  value: availableCount.toString(), icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Active Teams',   value: '4',                    icon: Shield,       color: 'text-violet-400' },
    { label: 'Avg Rating',     value: `${avgRating}★`,        icon: Star,         color: 'text-amber-400' },
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
            <div className="kpi-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── AI Insights ───────────────────────────────────────── */}
      <div className="rounded-xl bg-indigo-500/[0.07] border border-indigo-500/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-medium text-indigo-300">AI Team Insights</span>
        </div>
        <ul className="space-y-1.5">
          {AI_INSIGHTS.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-indigo-500 mt-0.5 flex-shrink-0">•</span>
              {insight}
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
                  <Card className="hover:border-indigo-500/20 transition-all duration-200">
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
                              className="flex-1 flex items-center gap-2.5 rounded-lg bg-[#0d1321] border border-[#1e2a3a] p-3 cursor-pointer hover:border-indigo-500/30 transition-colors"
                              onClick={() => setSelectedCleaner(cleaner.id)}
                            >
                              <div className="relative">
                                <Avatar initials={cleaner.initials} color={team.color} size="sm" />
                                <div
                                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d1321]"
                                  style={{ backgroundColor: sc.dot }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-200 truncate">
                                  {cleaner.name.split(' ')[0]}
                                </p>
                                <span className={`text-[10px] font-medium ${sc.text}`}>
                                  {sc.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Team stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-[#0d1321] p-2">
                          <p className="text-base font-bold text-white">{completedJobs.length}</p>
                          <p className="text-[10px] text-slate-600">Jobs Done</p>
                        </div>
                        <div className="rounded-lg bg-[#0d1321] p-2">
                          <p className="text-base font-bold text-emerald-400">
                            {formatCurrency(teamRevenue)}
                          </p>
                          <p className="text-[10px] text-slate-600">Revenue</p>
                        </div>
                        <div className="rounded-lg bg-[#0d1321] p-2">
                          <p className="text-base font-bold text-amber-400">{avgTeamRating}★</p>
                          <p className="text-[10px] text-slate-600">Rating</p>
                        </div>
                      </div>

                      {/* Home area */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
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
                  <Card className="hover:border-indigo-500/20 transition-all">
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={cleaner.initials} color={cleaner.color} size="md" />
                          <div>
                            <p className="font-semibold text-slate-100 text-sm">{cleaner.name}</p>
                            <p className="text-xs text-slate-500">{TEAM_NAMES[cleaner.teamId]}</p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                        >
                          {sc.label}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* Rating */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Rating</span>
                          <span className="text-amber-400 font-medium">⭐ {cleaner.rating}</span>
                        </div>

                        {/* Reliability */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Reliability</span>
                          <span className="text-emerald-400 font-medium">
                            {cleaner.reliabilityScore}%
                          </span>
                        </div>
                        <Progress value={cleaner.reliabilityScore} color="bg-emerald-500" />

                        {/* Total jobs */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Total Jobs</span>
                          <span className="text-slate-200 font-medium">{cleaner.totalJobs}</span>
                        </div>

                        {/* This month completed */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Completed (mo.)</span>
                          <span className="text-slate-300 font-medium">{completedCount}</span>
                        </div>

                        {/* Monthly pay */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">This Month Pay</span>
                          <span className="text-indigo-400 font-bold">
                            {formatCurrency(monthPay)}
                          </span>
                        </div>

                        {/* Home area */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mt-1">
                          <MapPin className="h-3 w-3" />
                          {cleaner.homeAreaName}
                        </div>

                        {/* Specialties */}
                        <div className="flex flex-wrap gap-1">
                          {cleaner.specialties.map(s => (
                            <span
                              key={s}
                              className="text-[9px] bg-[#0d1321] border border-[#1e2a3a] text-slate-400 rounded px-1.5 py-0.5 capitalize"
                            >
                              {s.replace('-', ' ')}
                            </span>
                          ))}
                        </div>

                        {/* Availability days */}
                        <div className="flex gap-1">
                          {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(d => (
                            <div
                              key={d}
                              className={`flex-1 text-center rounded text-[8px] py-0.5 ${
                                cleaner.availableHours[d]
                                  ? 'bg-indigo-500/20 text-indigo-400'
                                  : 'bg-[#1a2537] text-slate-600'
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
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <CardTitle>Monthly Pay Calculator</CardTitle>
                </div>
                <Badge variant="neutral">April 2026</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-6 gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <div className="col-span-2">Cleaner</div>
                  <div>Jobs Done</div>
                  <div>Job Revenue</div>
                  <div>Pay Rate</div>
                  <div>Est. Pay</div>
                </div>

                {/* Cleaner rows */}
                {CLEANERS.map(cleaner => {
                  const completedJobs = JOBS.filter(
                    j => j.cleanerIds.includes(cleaner.id) && j.status === 'completed'
                  )
                  const jobRevenue = completedJobs.reduce((s, j) => s + j.price, 0)
                  const pay = getMonthlyPay(cleaner.id)

                  return (
                    <div
                      key={cleaner.id}
                      className="grid grid-cols-6 gap-3 items-center px-3 py-3 rounded-lg bg-[#0d1321] border border-[#1e2a3a] hover:border-indigo-500/20 transition-colors"
                    >
                      <div className="col-span-2 flex items-center gap-2.5">
                        <Avatar initials={cleaner.initials} color={cleaner.color} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{cleaner.name}</p>
                          <p className="text-[10px] text-slate-600">{TEAM_NAMES[cleaner.teamId]}</p>
                        </div>
                      </div>
                      <div className="text-sm text-slate-300 font-medium">{completedJobs.length}</div>
                      <div className="text-sm text-slate-400">{formatCurrency(jobRevenue)}</div>
                      <div className="text-sm text-slate-500">35%</div>
                      <div className="text-sm font-bold text-emerald-400">{formatCurrency(pay)}</div>
                    </div>
                  )
                })}

                {/* Total row */}
                <div className="grid grid-cols-6 gap-3 items-center px-3 py-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mt-2">
                  <div className="col-span-2 text-sm font-semibold text-slate-200">
                    Total Payroll
                  </div>
                  <div className="text-sm text-slate-300">
                    {JOBS.filter(j => j.status === 'completed').length}
                  </div>
                  <div className="text-sm text-slate-400">
                    {formatCurrency(
                      JOBS.filter(j => j.status === 'completed').reduce((s, j) => s + j.price, 0)
                    )}
                  </div>
                  <div className="text-sm text-slate-500">—</div>
                  <div className="text-sm font-bold text-indigo-400">
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
