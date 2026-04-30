'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Star, CheckCircle, Shield, MapPin, TrendingUp, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatTile } from '@/components/ui/stat-tile'
import { formatCurrency, cn } from '@/lib/utils'
import type { Cleaner, Job, Team } from '@/types'
import { InviteCleanerForm } from './invite-form'
import { CreateTeamForm } from './create-team-form'

type TeamData = { cleaners: Cleaner[]; jobs: Job[]; teams: Team[] }

type StatusKey = 'available' | 'en-route' | 'cleaning' | 'off-duty'

const STATUS_PILL: Record<StatusKey, { pill: string; text: string; label: string; dot: string }> = {
  available:  { pill: 'bg-emerald-500/12 text-emerald-500 border border-emerald-500/20', text: 'text-emerald-500', label: 'Available', dot: 'bg-emerald-500' },
  'en-route': { pill: 'bg-amber-500/12 text-amber-500 border border-amber-500/20',       text: 'text-amber-500',   label: 'En Route',  dot: 'bg-amber-500' },
  cleaning:   { pill: 'bg-mint-500/12 text-mint-500 border border-mint-500/20',          text: 'text-mint-500',    label: 'Cleaning',  dot: 'bg-mint-500' },
  'off-duty': { pill: 'bg-soft text-ink-500 border border-line',                         text: 'text-ink-500',     label: 'Off Duty',  dot: 'bg-ink-300' },
}


function deriveInsights(cleaners: Cleaner[], jobs: Job[], teams: { id: string; name: string; cleaners: Cleaner[] }[]): string[] {
  const insights: string[] = []
  const todayStr = new Date().toISOString().split('T')[0]

  // Cleaners with no jobs today
  const idleToday = cleaners.filter(
    c => c.status === 'available' && !jobs.some(j => j.scheduledDate === todayStr && j.cleanerIds.includes(c.id))
  )
  if (idleToday.length > 0) {
    insights.push(`${idleToday.length} cleaner${idleToday.length > 1 ? 's are' : ' is'} available with no jobs scheduled today.`)
  }

  // Top reliability team
  const teamsWithCleaners = teams.filter(t => t.cleaners.length > 0)
  if (teamsWithCleaners.length > 0) {
    const topTeam = teamsWithCleaners.reduce((best, t) => {
      const avg = t.cleaners.reduce((s, c) => s + c.reliabilityScore, 0) / t.cleaners.length
      const bestAvg = best.cleaners.reduce((s, c) => s + c.reliabilityScore, 0) / best.cleaners.length
      return avg > bestAvg ? t : best
    })
    const score = Math.round(topTeam.cleaners.reduce((s, c) => s + c.reliabilityScore, 0) / topTeam.cleaners.length)
    insights.push(`${topTeam.name} has the highest reliability score this month (${score}%) — great for premium clients.`)
  }

  // Move-out specialists
  const moveOutCleaners = cleaners.filter(c => c.specialties?.includes('move-out'))
  if (moveOutCleaners.length > 0) {
    insights.push(`${moveOutCleaners.length} cleaner${moveOutCleaners.length > 1 ? 's are' : ' is'} certified for move-out cleans.`)
  }

  return insights.length > 0 ? insights : ['No insights yet — data will appear as jobs are completed.']
}

export function TeamClient({ cleaners, jobs, teams: teamsProp }: TeamData) {
  const [_selectedCleaner, setSelectedCleaner] = useState<string | null>(null)

  const avgRating = cleaners.length
    ? (cleaners.reduce((s, c) => s + c.rating, 0) / cleaners.length).toFixed(1)
    : '0.0'
  const availableCount = cleaners.filter(c => c.status === 'available').length

  // Group cleaners by team — driven by the teams table, not a hardcoded list.
  const teams = teamsProp
    .filter(t => !t.archived)
    .map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      cleaners: cleaners.filter(c => c.teamId === t.id),
    }))
  const teamNameById: Record<string, string> = Object.fromEntries(
    teamsProp.map(t => [t.id, t.name]),
  )

  // Calculate monthly pay per cleaner (35% of each completed job price)
  const getMonthlyPay = (cleanerId: string) => {
    const completedJobs = jobs.filter(
      j => j.cleanerIds.includes(cleanerId) && j.status === 'completed'
    )
    return completedJobs.reduce((s, j) => s + j.price * 0.35, 0)
  }

  const stats = [
    { label: 'Total Cleaners', value: cleaners.length.toString(),                                       icon: Users,       tone: 'mint'    as const },
    { label: 'Available Now',  value: availableCount.toString(),                                       icon: CheckCircle, tone: 'emerald' as const },
    { label: 'Active Teams',   value: teams.filter(t => t.cleaners.length).length.toString(),         icon: Shield,      tone: 'mint'    as const },
    { label: 'Avg Rating',     value: `${avgRating}★`,                                                 icon: Star,        tone: 'amber'   as const },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <InviteCleanerForm />
        <CreateTeamForm />
      </div>

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

      {/* ── Team Insights ─────────────────────────────────────── */}
      <div className="card px-5 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-mint-500/12">
            <Sparkles className="h-[14px] w-[14px] text-mint-500" strokeWidth={2.25} />
          </div>
          <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">Team Insights</h2>
        </div>
        <ul className="space-y-2.5">
          {deriveInsights(cleaners, jobs, teams).map((insight, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-mint-500 flex-shrink-0" />
              <span className="text-[13px] text-ink-700 leading-[1.55]">{insight}</span>
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
              const avgTeamRating = team.cleaners.length
                ? (team.cleaners.reduce((s, c) => s + c.rating, 0) / team.cleaners.length).toFixed(1)
                : '0.0'

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="card">
                    <div className="flex items-center justify-between border-b border-line px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">{team.name}</h2>
                      </div>
                      <Badge variant="neutral">
                        <span className="num">{todayJobs.length}</span>&nbsp;jobs today
                      </Badge>
                    </div>
                    <div className="px-5 py-5 space-y-4">
                      {/* Cleaner pills */}
                      <div className="flex items-center gap-3">
                        {team.cleaners.map(cleaner => {
                          const sp = STATUS_PILL[cleaner.status as StatusKey] ?? STATUS_PILL['off-duty']
                          return (
                            <button
                              key={cleaner.id}
                              type="button"
                              className="flex-1 flex items-center gap-2.5 p-3 rounded-[10px] bg-soft border border-line cursor-pointer transition-colors duration-150 hover:bg-hover hover:border-line-strong text-left"
                              onClick={() => setSelectedCleaner(cleaner.id)}
                            >
                              <div className="relative">
                                <Avatar initials={cleaner.initials} color={team.color} size="sm" />
                                <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-soft', sp.dot)} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-ink-900">
                                  {cleaner.name.split(' ')[0]}
                                </p>
                                <span className={cn('text-[11px] font-medium', sp.text)}>
                                  {sp.label}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Team stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-[10px] p-3 bg-soft border border-line">
                          <p className="num text-[18px] font-semibold tracking-[-0.01em] text-ink-900">{completedJobs.length}</p>
                          <p className="text-[11.5px] text-ink-500 mt-0.5">Jobs Done</p>
                        </div>
                        <div className="rounded-[10px] p-3 bg-soft border border-line">
                          <p className="num text-[18px] font-semibold tracking-[-0.01em] text-emerald-500">{formatCurrency(teamRevenue)}</p>
                          <p className="text-[11.5px] text-ink-500 mt-0.5">Revenue</p>
                        </div>
                        <div className="rounded-[10px] p-3 bg-soft border border-line">
                          <p className="num text-[18px] font-semibold tracking-[-0.01em] text-amber-500">{avgTeamRating}★</p>
                          <p className="text-[11.5px] text-ink-500 mt-0.5">Rating</p>
                        </div>
                      </div>

                      {/* Home area */}
                      <div className="flex items-center gap-1.5 text-[12.5px] text-ink-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Based in {team.cleaners[0]?.homeAreaName}</span>
                      </div>
                    </div>
                  </div>
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
                  <div className="card p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={cleaner.initials} color={cleaner.color} size="md" />
                        <div>
                          <p className="text-[13.5px] font-semibold text-ink-900">{cleaner.name}</p>
                          <p className="text-[11.5px] text-ink-400 mt-0.5">{teamNameById[cleaner.teamId] ?? '—'}</p>
                        </div>
                      </div>
                      <span className={cn('text-[10.5px] font-medium px-2 py-[3px] rounded-full', sp.pill)}>
                        {sp.label}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-ink-500">Rating</span>
                        <span className="text-amber-500 font-medium">★ {cleaner.rating}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-ink-500">Reliability</span>
                        <span className="num text-emerald-500 font-semibold">{cleaner.reliabilityScore}%</span>
                      </div>
                      <Progress value={cleaner.reliabilityScore} color="var(--green-500)" />
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-ink-500">Total Jobs</span>
                        <span className="num text-ink-700 font-medium">{cleaner.totalJobs}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-ink-500">Completed (mo.)</span>
                        <span className="num text-ink-700 font-medium">{completedCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-ink-500">This Month Pay</span>
                        <span className="num font-semibold text-mint-500">{formatCurrency(monthPay)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-ink-400">
                        <MapPin className="h-3 w-3" />
                        {cleaner.homeAreaName}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cleaner.specialties.map(s => (
                          <span
                            key={s}
                            className="capitalize text-[11px] bg-soft border border-line text-ink-500 rounded-[6px] px-1.5 py-0.5"
                          >
                            {s.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(d => (
                          <div
                            key={d}
                            className={cn(
                              'flex-1 text-center rounded-[6px] py-1 text-[10.5px] font-medium',
                              cleaner.availableHours[d]
                                ? 'bg-mint-500/12 text-mint-500'
                                : 'bg-elev text-ink-400',
                            )}
                          >
                            {d[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Pay Calculator Tab ─────────────────────────────── */}
        <TabsContent value="pay">
          <div className="card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-[15px] w-[15px] text-mint-500" />
                <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">Monthly Pay Calculator</h2>
              </div>
              <Badge variant="neutral">April 2026</Badge>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-6 gap-3 px-3 py-2.5 text-[12px] font-medium text-ink-500">
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
                      className="grid grid-cols-6 gap-3 items-center px-3 py-3.5 rounded-[10px] bg-soft border border-line transition-colors duration-150 hover:border-line-strong"
                    >
                      <div className="col-span-2 flex items-center gap-2.5">
                        <Avatar initials={cleaner.initials} color={cleaner.color} size="sm" />
                        <div>
                          <p className="text-[13px] font-medium text-ink-900">{cleaner.name}</p>
                          <p className="text-[11px] text-ink-400 mt-0.5">{teamNameById[cleaner.teamId] ?? '—'}</p>
                        </div>
                      </div>
                      <div className="num text-[13px] font-medium text-ink-700">{completedJobs.length}</div>
                      <div className="num text-[13px] text-ink-500">{formatCurrency(jobRevenue)}</div>
                      <div className="num text-[13px] text-ink-400">35%</div>
                      <div className="num text-[13px] font-semibold text-emerald-500">{formatCurrency(pay)}</div>
                    </div>
                  )
                })}

                {/* Total row */}
                <div className="grid grid-cols-6 gap-3 items-center px-3 py-3.5 mt-1 rounded-[10px] bg-mint-500/8 border border-mint-500/20">
                  <div className="col-span-2 text-[13px] font-semibold text-ink-900">Total Payroll</div>
                  <div className="num text-[13px] font-medium text-ink-700">{jobs.filter(j => j.status === 'completed').length}</div>
                  <div className="num text-[13px] text-ink-500">
                    {formatCurrency(jobs.filter(j => j.status === 'completed').reduce((s, j) => s + j.price, 0))}
                  </div>
                  <div className="text-[13px] text-ink-400">—</div>
                  <div className="num text-[13px] font-semibold text-mint-500">
                    {formatCurrency(cleaners.reduce((s, c) => s + getMonthlyPay(c.id), 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
