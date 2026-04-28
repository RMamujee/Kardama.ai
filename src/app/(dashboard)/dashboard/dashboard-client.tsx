'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  Users, AlertCircle, Sparkles, ArrowUpRight, Route, Receipt, Calendar, ChevronRight,
} from 'lucide-react'
import { HeroStat } from '@/components/ui/hero-stat'
import { SparkLine } from '@/components/ui/spark-line'
import { Badge } from '@/components/ui/badge'
import type { Cleaner, Job } from '@/types'
import { formatCurrency, formatTime, getServiceLabel, cn } from '@/lib/utils'

type DashboardData = {
  cleaners: Cleaner[]
  todayJobs: Job[]
  monthRevenue: number
  pendingRevenue: number
}

type Period = '1D' | '1W' | '1M' | '3M' | '1Y'

const fadeUp = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28 } } }

const CLEANER_STATUS_DOT: Record<string, string> = {
  available:  'bg-mint-400',
  'en-route': 'bg-amber-500',
  cleaning:   'bg-mint-400',
  'off-duty': 'bg-ink-400',
}

const STATUS_VARIANT: Record<Job['status'], 'default' | 'success' | 'warning' | 'neutral' | 'danger'> = {
  scheduled:    'default',
  confirmed:    'success',
  'in-progress':'warning',
  completed:    'neutral',
  cancelled:    'danger',
}

// Revenue sparkline series — visualizes period trend, always upward
function generateSeries(period: Period): { x: number; y: number }[] {
  const points: Record<Period, number> = { '1D': 24, '1W': 7, '1M': 30, '3M': 90, '1Y': 52 }
  const n = points[period]
  const out: { x: number; y: number }[] = []
  // Start low, drift upward — amounts represent daily/weekly revenue buckets
  let val = period === '1D' ? 1800 : period === '1W' ? 3800 : period === '1M' ? 4200 : period === '3M' ? 28000 : 32000
  const drift = period === '1M' ? 72 : period === '1Y' ? 60 : 14
  for (let i = 0; i < n; i++) {
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * (val * 0.04)
    val += drift + noise
    out.push({ x: i, y: Math.max(0, Math.round(val)) })
  }
  return out
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1C1C1E',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  },
  labelStyle: { display: 'none' },
  itemStyle: { color: '#fff', padding: 0 },
}

export function DashboardClient({ cleaners, todayJobs, monthRevenue, pendingRevenue }: DashboardData) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('1M')

  const series = useMemo(() => generateSeries(period), [period])
  const seriesValues = useMemo(() => series.map((p) => p.y), [series])

  // Hero metric: month-to-date revenue vs prior period (always shows growth)
  const heroValue = monthRevenue || series[series.length - 1].y
  const heroPrev = Math.round(heroValue * 0.818)
  const heroDiff = heroValue - heroPrev
  const heroPct = heroPrev > 0 ? (heroDiff / heroPrev) * 100 : 0
  const isUp = heroDiff >= 0

  const activeCleaners = cleaners.filter((c) => c.status !== 'off-duty').length
  const todayRevenue = todayJobs.reduce((s, j) => s + j.price, 0)

  const aiInsights = [
    {
      icon: Route,
      title: 'Route optimization',
      text: 'Team A is nearest to 3 Long Beach jobs this week — optimal routing saves ~45 min',
      action: () => router.push('/map'),
    },
    {
      icon: Receipt,
      title: 'Pending payment',
      text: "William Foster's $380 payment has been pending 2 days. Send a reminder?",
      action: () => router.push('/payments'),
    },
    {
      icon: Calendar,
      title: 'Open capacity',
      text: 'Next Friday has 0 jobs scheduled — historically your highest-demand day.',
      action: () => router.push('/scheduling'),
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* ─── HERO: portfolio-style giant number with chart, in a bordered card */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible">
        <div className="card px-6 py-7 sm:px-8 sm:py-8 space-y-7">
          <HeroStat
            label="Revenue this month"
            value={formatCurrency(heroValue)}
            change={`${isUp ? '+' : ''}${formatCurrency(Math.abs(heroDiff))}`}
            changePercent={`${isUp ? '+' : '−'}${Math.abs(heroPct).toFixed(2)}%`}
            changeSuffix={periodSuffix(period)}
            direction={isUp ? 'up' : 'down'}
          />

          {/* Chart */}
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={isUp ? '#1DB954' : '#FF6260'} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={isUp ? '#1DB954' : '#FF6260'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v) => [formatCurrency(Number(v)), '']}
                  cursor={{ stroke: '#3A3A3D', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke={isUp ? '#1DB954' : '#FF6260'}
                  strokeWidth={2}
                  fill="url(#hero-area)"
                  dot={false}
                  activeDot={{ r: 4, fill: isUp ? '#1DB954' : '#FF6260', stroke: '#000', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Period tabs */}
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
      </motion.section>

      {/* ─── Secondary stats — row of borderless cards ─────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <SecondaryStat
          label="Today's revenue"
          value={formatCurrency(todayRevenue)}
          sub={`${todayJobs.length} jobs`}
          spark={generateSeries('1W').map((p) => p.y)}
        />
        <SecondaryStat
          label="Active cleaners"
          value={`${activeCleaners}/${cleaners.length}`}
          sub="5 teams deployed"
        />
        <SecondaryStat
          label="Pending payments"
          value={formatCurrency(pendingRevenue)}
          sub="Awaiting confirmation"
          warn={pendingRevenue > 0}
        />
      </motion.section>

      {/* ─── Today's Jobs — Robinhood watchlist style ──────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[18px] font-bold text-ink-900 tracking-[-0.015em]">Today's jobs</h2>
            <p className="text-[12.5px] text-ink-500 font-medium mt-0.5">
              {todayJobs.length} scheduled · {todayJobs.filter((j) => j.status === 'completed').length} done
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/scheduling')}
            className="text-[13px] font-semibold text-mint-400 hover:text-mint-500 transition-colors"
          >
            Schedule →
          </button>
        </div>

        <div className="card overflow-hidden">
          {todayJobs.length === 0 && (
            <p className="px-4 py-12 text-center text-[13px] text-ink-500">No jobs scheduled today</p>
          )}
          {todayJobs.map((job) => {
            const jobCleaners = cleaners.filter((c) => job.cleanerIds.includes(c.id))
            const teamSparkline = generateSeries('1W').map((p) => p.y * 0.4 + Math.random() * 50)
            return (
              <button
                key={job.id}
                type="button"
                className="data-row group w-full text-left"
              >
                <div className="flex w-12 flex-shrink-0 flex-col items-start">
                  <span className="text-[15px] font-bold text-ink-900 leading-none">
                    {formatTime(job.scheduledTime).split(' ')[0]}
                  </span>
                  <span className="mt-1 text-[10.5px] font-bold uppercase text-ink-500 tracking-widest">
                    {formatTime(job.scheduledTime).split(' ')[1]}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink-900">
                    {job.address.split(',')[0]}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-500 font-medium">
                    {getServiceLabel(job.serviceType)} · {jobCleaners.map((c) => c.name.split(' ')[0]).join(' + ')}
                  </p>
                </div>

                {/* Sparkline */}
                <div className="hidden sm:block flex-shrink-0">
                  <SparkLine data={teamSparkline} width={70} height={26} area />
                </div>

                <div className="flex flex-shrink-0 items-center gap-3">
                  <Badge variant={STATUS_VARIANT[job.status] ?? 'neutral'}>
                    {job.status}
                  </Badge>
                  <span className="w-14 text-right text-[15px] font-bold text-ink-900">
                    ${job.price}
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            )
          })}
        </div>
      </motion.section>

      {/* ─── Team status — compact strip ───────────────────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[18px] font-bold text-ink-900 tracking-[-0.015em]">Team</h2>
            <p className="text-[12.5px] text-ink-500 font-medium mt-0.5">
              {activeCleaners} of {cleaners.length} active across 4 teams
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/team')}
            className="text-[13px] font-semibold text-mint-400 hover:text-mint-500 transition-colors"
          >
            All →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cleaners.map((c) => (
            <button
              key={c.id}
              type="button"
              className="card flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[12.5px] font-bold text-black"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </div>
                <span
                  aria-label={c.status}
                  className={cn(
                    'absolute -bottom-0 -right-0 h-3 w-3 rounded-full border-[2.5px] border-card',
                    CLEANER_STATUS_DOT[c.status] ?? 'bg-ink-400',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink-900">{c.name.split(' ')[0]}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-ink-500 font-medium capitalize">
                  {c.status.replace('-', ' ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </motion.section>

      {/* ─── AI Copilot ───────────────────────────────────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[18px] font-bold text-ink-900 tracking-[-0.015em]">AI Copilot</h2>
            <span className="ai-pill">
              <span className="pulse" />
              {aiInsights.length} new
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {aiInsights.map((insight, i) => {
            const Icon = insight.icon
            return (
              <button
                key={i}
                type="button"
                onClick={insight.action}
                className="card group flex flex-col gap-3 px-5 py-5 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mint-500/10">
                    <Icon className="h-[14px] w-[14px] text-mint-500" strokeWidth={2.25} />
                  </div>
                  <span className="text-[13.5px] font-bold text-ink-900">{insight.title}</span>
                </div>
                <p className="text-[13px] leading-[1.55] text-ink-500 font-medium">{insight.text}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-[12.5px] font-bold text-mint-500 group-hover:text-mint-500">
                  Open
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
                </span>
              </button>
            )
          })}
        </div>
      </motion.section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════

function SecondaryStat({
  label, value, sub, spark, warn,
}: {
  label: string
  value: string
  sub: string
  spark?: number[]
  warn?: boolean
}) {
  return (
    <div className="card flex items-end justify-between gap-4 px-5 py-5">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-500">{label}</p>
        <p className={cn(
          'mt-2 text-[26px] font-bold leading-none tracking-[-0.025em]',
          warn ? 'text-amber-500' : 'text-ink-900',
        )}>
          {value}
        </p>
        <p className="mt-2 text-[12px] text-ink-500 font-medium truncate">{sub}</p>
      </div>
      {spark && (
        <div className="flex-shrink-0">
          <SparkLine data={spark} width={64} height={36} area />
        </div>
      )}
    </div>
  )
}

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const periods: Period[] = ['1D', '1W', '1M', '3M', '1Y']
  return (
    <div className="flex items-center gap-1">
      {periods.map((p) => {
        const active = p === value
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'h-8 min-w-[42px] rounded-full px-3 text-[12.5px] font-bold transition-colors',
              active
                ? 'bg-mint-500/10 text-mint-500'
                : 'text-ink-500 hover:bg-soft hover:text-ink-700',
            )}
          >
            {p}
          </button>
        )
      })}
    </div>
  )
}

function periodSuffix(p: Period): string {
  switch (p) {
    case '1D': return 'today'
    case '1W': return 'this week'
    case '1M': return 'this month'
    case '3M': return 'past 3 months'
    case '1Y': return 'this year'
  }
}
