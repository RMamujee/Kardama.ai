'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, DollarSign, Briefcase, Star, ArrowUpRight, ArrowDownRight, Sparkles,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatTile } from '@/components/ui/stat-tile'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import type { Cleaner, Customer, Job } from '@/types'

type AnalyticsData = { jobs: Job[]; customers: Customer[]; cleaners: Cleaner[] }

type Period = 'week' | 'month' | 'quarter' | 'year'

const PERIOD_DAYS: Record<Period, number> = {
  week:    7,
  month:   30,
  quarter: 90,
  year:    365,
}

const PERIOD_LABEL: Record<Period, string> = {
  week:    'this week',
  month:   'this month',
  quarter: 'last 90 days',
  year:    'this year',
}

// ─── Tooltip styling shared by all charts ─────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0F1B2D',
    border: '1px solid #25395A',
    borderRadius: 8,
    color: '#F2F5FB',
    fontFamily: 'var(--font-mono)',
    fontSize: 11.5,
    padding: '8px 10px',
    boxShadow: '0 24px 64px -16px rgba(0,0,0,0.7)',
  },
  labelStyle: { color: '#7283A6', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: 10 },
  itemStyle: { color: '#F2F5FB' },
}

const SERVICE_COLORS = ['#5EEAD4', '#34D399', '#F5A524', '#60A5FA', '#F87171']

// ═══════════════════════════════════════════════════════════════════════════

export function AnalyticsClient({ jobs, customers, cleaners }: AnalyticsData) {
  const [period, setPeriod] = useState<Period>('year')

  // ── Period range — used to filter jobs/customers/payments throughout
  const range = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - PERIOD_DAYS[period])
    return { start, end, days: PERIOD_DAYS[period] }
  }, [period])

  // ── Jobs in period (drives every KPI)
  const periodJobs = useMemo(
    () => jobs.filter((j) => {
      const d = new Date(j.scheduledDate)
      return d >= range.start && d <= range.end
    }),
    [jobs, range],
  )

  const completedInPeriod = periodJobs.filter((j) => j.status === 'completed')
  const totalRevenue =
    completedInPeriod.reduce((s, j) => s + j.price, 0)
    || periodJobs.reduce((s, j) => s + j.price, 0) // fall back if no completed
  const completedCount = completedInPeriod.length
  const avgJobValue = periodJobs.length > 0 ? Math.round(periodJobs.reduce((s, j) => s + j.price, 0) / periodJobs.length) : 0
  const completionRate = periodJobs.length > 0 ? Math.round((completedCount / periodJobs.length) * 100) : 0

  // ── Comparison: previous equivalent window
  const previousJobs = useMemo(() => {
    const prevEnd = new Date(range.start)
    const prevStart = new Date(range.start)
    prevStart.setDate(prevStart.getDate() - PERIOD_DAYS[period])
    return jobs.filter((j) => {
      const d = new Date(j.scheduledDate)
      return d >= prevStart && d < prevEnd
    })
  }, [jobs, range.start, period])

  const previousRevenue = previousJobs
    .filter((j) => j.status === 'completed')
    .reduce((s, j) => s + j.price, 0) || previousJobs.reduce((s, j) => s + j.price, 0)
  const revenueChange = previousRevenue > 0
    ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
    : null
  const jobsChange = previousJobs.length > 0
    ? Math.round(((completedCount - previousJobs.length) / previousJobs.length) * 100)
    : null

  // ── Time series for the area chart
  // For 'week'/'month': daily buckets. For 'quarter'/'year': weekly buckets.
  const timeSeries = useMemo(() => {
    const buckets = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 13 : 52
    const granularity = period === 'week' || period === 'month' ? 'day' : 'week'
    const result: { label: string; revenue: number; jobs: number }[] = []
    const totalDays = PERIOD_DAYS[period]
    const step = totalDays / buckets

    for (let i = 0; i < buckets; i++) {
      const start = new Date(range.start)
      start.setDate(start.getDate() + Math.floor(i * step))
      const end = new Date(range.start)
      end.setDate(end.getDate() + Math.floor((i + 1) * step))
      const bucketJobs = jobs.filter((j) => {
        const d = new Date(j.scheduledDate)
        return d >= start && d < end
      })
      const revenue = bucketJobs.reduce((s, j) => s + j.price, 0)
      const label = granularity === 'day'
        ? start.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
        : start.toLocaleDateString('en-US', { month: 'short' })
      result.push({ label, revenue, jobs: bucketJobs.length })
    }

    return result
  }, [jobs, range.start, period])

  // ── Top customers in period
  const topCustomers = useMemo(() => {
    const totals = new Map<string, number>()
    for (const j of periodJobs) {
      totals.set(j.customerId, (totals.get(j.customerId) ?? 0) + j.price)
    }
    return Array.from(totals.entries())
      .map(([id, value]) => {
        const c = customers.find((x) => x.id === id)
        if (!c) return null
        const parts = c.name.split(' ')
        const label = parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '')
        return { name: label, value }
      })
      .filter((x): x is { name: string; value: number } => x !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [periodJobs, customers])

  const maxCustomerSpend = topCustomers[0]?.value || 1

  // ── Service mix in period
  const serviceMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const j of periodJobs) {
      counts.set(j.serviceType, (counts.get(j.serviceType) ?? 0) + 1)
    }
    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0) || 1
    const labels: Record<string, string> = {
      standard: 'Standard',
      deep: 'Deep clean',
      'move-out': 'Move-out',
      'post-construction': 'Post-construction',
      airbnb: 'Airbnb',
    }
    return Array.from(counts.entries())
      .map(([type, count], i) => ({
        name: labels[type] ?? type,
        pct: Math.round((count / total) * 100),
        color: SERVICE_COLORS[i % SERVICE_COLORS.length],
        count,
      }))
      .sort((a, b) => b.pct - a.pct)
  }, [periodJobs])

  // ── Cities in period
  const cityBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const j of periodJobs) {
      const c = customers.find((x) => x.id === j.customerId)
      if (!c) continue
      counts.set(c.city, (counts.get(c.city) ?? 0) + 1)
    }
    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0) || 1
    return Array.from(counts.entries())
      .map(([city, count]) => ({
        city,
        jobs: count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 6)
  }, [periodJobs, customers])

  // ── Team performance in period
  const teamData = useMemo(() => {
    const teamIds = Array.from(new Set(cleaners.map((c) => c.teamId).filter(Boolean) as string[])).sort()
    const greekify: Record<string, string> = {
      'team-a': 'Alpha', 'team-b': 'Beta', 'team-c': 'Gamma',
      'team-d': 'Delta', 'team-e': 'Epsilon',
    }
    return teamIds.map((teamId) => {
      const teamCleaners = cleaners.filter((c) => c.teamId === teamId)
      const teamJobs = periodJobs.filter((j) => teamCleaners.some((c) => j.cleanerIds.includes(c.id)))
      const completed = teamJobs.filter((j) => j.status === 'completed')
      const revenue = completed.reduce((s, j) => s + j.price, 0)
      const avgRating = teamCleaners.length
        ? teamCleaners.reduce((s, c) => s + c.rating, 0) / teamCleaners.length
        : 0
      return {
        team: greekify[teamId] ?? teamId,
        cleaners: teamCleaners.map((c) => c.name.split(' ')[0]).join(' + '),
        jobs: teamJobs.length,
        completed: completed.length,
        revenue,
        completionRate: teamJobs.length > 0 ? Math.round((completed.length / teamJobs.length) * 100) : 0,
        rating: avgRating.toFixed(1),
      }
    })
  }, [cleaners, periodJobs])

  return (
    <div className="space-y-6">
      {/* ── Header + period selector ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="grid-label">Reports</span>
          <h2 className="mt-1.5 text-[20px] font-semibold text-ink-900 tracking-[-0.015em]">
            Performance, {PERIOD_LABEL[period]}
          </h2>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="week">7d</TabsTrigger>
            <TabsTrigger value="month">30d</TabsTrigger>
            <TabsTrigger value="quarter">90d</TabsTrigger>
            <TabsTrigger value="year">1y</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <StatTile
          label="Revenue"
          value={formatCurrency(totalRevenue)}
          sub={`vs previous ${PERIOD_LABEL[period]}`}
          icon={DollarSign}
          tone="mint"
          trend={
            revenueChange != null && (
              <Trend value={revenueChange} />
            )
          }
        />
        <StatTile
          label="Jobs completed"
          value={completedCount}
          sub={`${periodJobs.length} total scheduled`}
          icon={Briefcase}
          tone="emerald"
          trend={jobsChange != null && <Trend value={jobsChange} />}
        />
        <StatTile
          label="Avg job value"
          value={formatCurrency(avgJobValue)}
          sub="all service types"
          icon={TrendingUp}
          tone="mint"
        />
        <StatTile
          label="Completion rate"
          value={`${completionRate}%`}
          sub="of scheduled jobs"
          icon={Star}
          tone={completionRate >= 80 ? 'emerald' : completionRate >= 60 ? 'amber' : 'rose'}
        />
      </motion.div>

      {/* ── Revenue trend chart ────────────────────────────────────────────── */}
      <div className="card-tile">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-[14px] font-semibold text-ink-900">Revenue trend</h3>
            <p className="mt-0.5 text-[11.5px] text-ink-400 font-mono">
              {PERIOD_LABEL[period]} · {timeSeries.length} buckets
            </p>
          </div>
          <Badge variant="success" dot>
            <span className="num">{formatCurrency(totalRevenue)}</span>
          </Badge>
        </div>
        <div className="px-2 py-4 sm:px-4 sm:py-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mint-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#5EEAD4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#5EEAD4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1A2B47" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#7283A6', fontSize: 10.5, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#7283A6', fontSize: 10.5, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                formatter={(v) => [`$${Number(v).toLocaleString()}`, 'revenue']}
                {...TOOLTIP_STYLE}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#5EEAD4"
                fill="url(#mint-grad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#5EEAD4', stroke: '#0F1B2D', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Two-up: Top customers + Service mix ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top customers */}
        <div className="card-tile">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h3 className="text-[14px] font-semibold text-ink-900">Top customers</h3>
            <span className="grid-label">Top 5</span>
          </div>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {topCustomers.length === 0 && (
              <p className="text-center text-[12.5px] italic text-ink-400 py-4">
                No customer activity in this window
              </p>
            )}
            {topCustomers.map((c, i) => (
              <div key={c.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="num w-4 text-[11.5px] text-ink-400">{i + 1}</span>
                    <span className="text-[13px] font-medium text-ink-900">{c.name}</span>
                  </div>
                  <span className="num text-[13px] font-semibold text-ink-900">
                    {formatCurrency(c.value)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-soft">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.value / maxCustomerSpend) * 100}%` }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
                    className="h-full rounded-full bg-mint-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service mix */}
        <div className="card-tile flex flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h3 className="text-[14px] font-semibold text-ink-900">Service mix</h3>
            <span className="grid-label">{periodJobs.length} jobs</span>
          </div>
          <div className="space-y-3.5 px-5 py-5 sm:px-6">
            {serviceMix.length === 0 && (
              <p className="text-center text-[12.5px] italic text-ink-400 py-4">
                No jobs in this window
              </p>
            )}
            {serviceMix.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 text-[12.5px] text-ink-700">{s.name}</span>
                <div className="flex items-center gap-2.5">
                  <div className="h-1 w-24 overflow-hidden rounded-full bg-soft">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  </div>
                  <span className="num w-9 text-right text-[11.5px] text-ink-500">{s.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Service area + Team performance ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Service area */}
        <div className="card-tile lg:col-span-1">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h3 className="text-[14px] font-semibold text-ink-900">Service area</h3>
            <span className="grid-label">Long Beach 15mi</span>
          </div>
          <div className="space-y-3.5 px-5 py-5 sm:px-6">
            {cityBreakdown.length === 0 && (
              <p className="text-center text-[12.5px] italic text-ink-400 py-4">
                No jobs in this window
              </p>
            )}
            {cityBreakdown.map((a) => (
              <div key={a.city} className="flex items-center gap-3">
                <span className="w-28 flex-shrink-0 truncate text-[12.5px] text-ink-700">{a.city}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-soft">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${a.pct}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full bg-mint-500"
                  />
                </div>
                <span className="num w-12 text-right text-[11.5px] text-ink-500">{a.jobs}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team performance */}
        <div className="card-tile lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h3 className="text-[14px] font-semibold text-ink-900">Team performance</h3>
            <span className="grid-label">{teamData.length} teams</span>
          </div>
          <div>
            {/* Header row */}
            <div className="grid grid-cols-[1.5fr_60px_120px_100px_60px] gap-3 border-b border-line px-5 py-2.5 sm:px-6">
              <div className="grid-label">Team</div>
              <div className="grid-label text-right">Jobs</div>
              <div className="grid-label text-right">Revenue</div>
              <div className="grid-label text-right">Completion</div>
              <div className="grid-label text-right">Rating</div>
            </div>
            {teamData.length === 0 && (
              <p className="px-6 py-6 text-center text-[12.5px] italic text-ink-400">
                No team activity in this window
              </p>
            )}
            {teamData.map((team, i) => (
              <div
                key={team.team}
                className={cn(
                  'grid grid-cols-[1.5fr_60px_120px_100px_60px] items-center gap-3 px-5 py-3 sm:px-6',
                  i < teamData.length - 1 && 'border-b border-line',
                )}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink-900">Team {team.team}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400 font-mono truncate">{team.cleaners || '—'}</p>
                </div>
                <div className="num text-right text-[13px] text-ink-700">{team.jobs}</div>
                <div className="num text-right text-[13px] font-semibold text-ink-900">
                  {formatCurrency(team.revenue)}
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      'num text-[13px] font-medium',
                      team.completionRate >= 80 ? 'text-emerald-500'
                        : team.completionRate >= 60 ? 'text-amber-500'
                        : 'text-rose-500',
                    )}
                  >
                    {team.completionRate}%
                  </span>
                </div>
                <div className="num text-right text-[13px] text-amber-500">★ {team.rating}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI summary ─────────────────────────────────────────────────────── */}
      <div className="card-tile">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-mint-500/10">
              <Sparkles className="h-[14px] w-[14px] text-mint-500" strokeWidth={2.25} />
            </div>
            <h3 className="text-[14px] font-semibold text-ink-900">AI Summary</h3>
            <Badge variant="default">{PERIOD_LABEL[period]}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-2">
          {generateInsights(period, totalRevenue, completedCount, completionRate, topCustomers).map((insight, i) => (
            <div key={i} className="bg-card px-5 py-4 sm:px-6">
              <span className="grid-label !text-mint-500/80">{insight.title}</span>
              <p className="mt-2 text-[13px] leading-[1.55] text-ink-700">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Trend({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span
      className={cn(
        'flex items-center gap-1 font-mono text-[11px] font-medium',
        up ? 'text-emerald-500' : 'text-rose-500',
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? '+' : ''}{value}%
    </span>
  )
}

function generateInsights(
  period: Period,
  revenue: number,
  completedCount: number,
  completionRate: number,
  topCustomers: { name: string; value: number }[],
) {
  const out: { title: string; text: string }[] = []
  if (revenue > 0) {
    out.push({
      title: 'Revenue signal',
      text: `${formatCurrency(revenue)} in ${PERIOD_LABEL[period]}, with ${completedCount} job${completedCount === 1 ? '' : 's'} completed.`,
    })
  }
  if (completionRate < 80 && completionRate > 0) {
    out.push({
      title: 'Operational risk',
      text: `Completion rate is ${completionRate}% — investigate cancellations or delays before they compound.`,
    })
  }
  if (topCustomers[0]) {
    const share = Math.round((topCustomers[0].value / Math.max(1, revenue)) * 100)
    out.push({
      title: 'Customer concentration',
      text: `${topCustomers[0].name} drove ${share}% of revenue this window. Strong account, watch concentration risk.`,
    })
  }
  if (completedCount > 0) {
    out.push({
      title: 'Recommendation',
      text: 'Deep cleans typically carry 40% higher margin than standard cleans — promote them in re-engagement texts.',
    })
  }
  while (out.length < 4) {
    out.push({ title: 'Heads up', text: 'Pick a longer window to see trends and recommendations.' })
  }
  return out.slice(0, 4)
}
