'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  Users, ArrowUpRight, Route, Receipt, Calendar, ChevronRight,
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
  revenueHistory: { month: string; total: number }[]
}

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

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#131A14',
    border: '1px solid #2D3C33',
    borderRadius: 8,
    color: '#F2FDF5',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 10px',
    boxShadow: '0 8px 24px rgba(2,8,4,0.85)',
  },
  labelStyle: { display: 'none' },
  itemStyle: { color: '#F2FDF5', padding: 0 },
}

export function DashboardClient({ cleaners, todayJobs, monthRevenue, pendingRevenue, revenueHistory }: DashboardData) {
  const router = useRouter()

  const series = useMemo(
    () => revenueHistory.map((h, i) => ({ x: i, y: h.total })),
    [revenueHistory],
  )

  const heroValue = monthRevenue
  const heroPrev = revenueHistory.length >= 2 ? revenueHistory[revenueHistory.length - 2].total : 0
  const heroDiff = heroValue - heroPrev
  const heroPct = heroPrev > 0 ? (heroDiff / heroPrev) * 100 : 0
  const isUp = heroDiff >= 0

  const activeCleaners = cleaners.filter((c) => c.status !== 'off-duty').length
  const availableCleaners = cleaners.filter((c) => c.status === 'available').length
  const todayRevenue = todayJobs.reduce((s, j) => s + j.price, 0)
  const teamCount = new Set(cleaners.map((c) => c.teamId).filter(Boolean)).size

  const aiInsights = [
    pendingRevenue > 0
      ? {
          icon: Receipt,
          title: 'Pending payment',
          text: `${formatCurrency(pendingRevenue)} in completed jobs awaiting payment confirmation.`,
          action: () => router.push('/payments'),
        }
      : {
          icon: Calendar,
          title: 'Schedule',
          text: todayJobs.length === 0
            ? 'No jobs scheduled today — a good time to confirm upcoming bookings or follow up with leads.'
            : `${todayJobs.length} job${todayJobs.length !== 1 ? 's' : ''} on the schedule today.`,
          action: () => router.push('/scheduling'),
        },
    {
      icon: Route,
      title: 'Team status',
      text: activeCleaners > 0
        ? `${activeCleaners} of ${cleaners.length} cleaners currently active across ${teamCount} team${teamCount !== 1 ? 's' : ''}.`
        : cleaners.length > 0
          ? `All ${cleaners.length} cleaners are off-duty.`
          : 'No cleaners added yet — invite your team.',
      action: () => router.push('/map'),
    },
    {
      icon: Users,
      title: 'Open capacity',
      text: availableCleaners > 0
        ? `${availableCleaners} cleaner${availableCleaners !== 1 ? 's' : ''} available for new bookings.`
        : 'No cleaners available right now — check the team page.',
      action: () => router.push('/team'),
    },
  ]

  return (
    <div className="space-y-12 pb-16">
      {/* ─── HERO: portfolio-style giant number with chart, in a bordered card */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible">
        <div className="hero-card px-8 py-8 sm:px-10 sm:py-10 space-y-8">
          <HeroStat
            label="Revenue this month"
            value={formatCurrency(heroValue)}
            change={`${isUp ? '+' : ''}${formatCurrency(Math.abs(heroDiff))}`}
            changePercent={`${isUp ? '+' : '−'}${Math.abs(heroPct).toFixed(2)}%`}
            changeSuffix="vs last month"
            direction={isUp ? 'up' : 'down'}
          />

          {/* Chart — real 6-month history */}
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
        </div>
      </motion.section>

      {/* ─── Secondary stats — row of borderless cards ─────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <SecondaryStat
          label="Today's revenue"
          value={formatCurrency(todayRevenue)}
          sub={`${todayJobs.length} job${todayJobs.length !== 1 ? 's' : ''}`}
        />
        <SecondaryStat
          label="Active cleaners"
          value={`${activeCleaners}/${cleaners.length}`}
          sub={`${teamCount} team${teamCount !== 1 ? 's' : ''} deployed`}
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
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-bold text-ink-900 tracking-[-0.015em]">Today's jobs</h2>
            <p className="text-[12.5px] text-ink-500 font-medium mt-1">
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
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-mint-500/[0.08]">
                <Calendar className="h-[18px] w-[18px] text-mint-500/70" />
              </div>
              <p className="text-[14px] font-medium text-ink-700">Clear schedule today</p>
              <p className="mt-1.5 text-[12.5px] text-ink-400 leading-[1.55]">A great moment to reach out to customers or plan the week ahead.</p>
              <button
                type="button"
                onClick={() => router.push('/scheduling')}
                className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mint-500 transition-colors hover:text-mint-400"
              >
                Add a job <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {todayJobs.map((job) => {
            const jobCleaners = cleaners.filter((c) => job.cleanerIds.includes(c.id))
            return (
              <button
                key={job.id}
                type="button"
                className="data-row group w-full text-left"
              >
                <div className="flex w-12 flex-shrink-0 flex-col items-start">
                  <span className="text-[15px] font-semibold text-ink-900 leading-none">
                    {formatTime(job.scheduledTime).split(' ')[0]}
                  </span>
                  <span className="mt-1 text-[11px] font-medium uppercase text-ink-500 tracking-[0.07em]">
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

                <div className="flex flex-shrink-0 items-center gap-3">
                  <Badge variant={STATUS_VARIANT[job.status] ?? 'neutral'}>
                    {job.status}
                  </Badge>
                  <span className="num w-14 text-right text-[14.5px] font-semibold text-ink-900">
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
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-bold text-ink-900 tracking-[-0.015em]">Team</h2>
            <p className="text-[12.5px] text-ink-500 font-medium mt-1">
              {activeCleaners} of {cleaners.length} active across {teamCount} team{teamCount !== 1 ? 's' : ''}
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cleaners.map((c) => (
            <button
              key={c.id}
              type="button"
              className="card flex items-center gap-3 px-5 py-4 text-left"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[12px] font-semibold text-black"
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
                <p className="mt-1 truncate text-[11.5px] text-ink-500 font-medium capitalize">
                  {c.status.replace('-', ' ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </motion.section>

      {/* ─── AI Copilot ───────────────────────────────────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-bold text-ink-900 tracking-[-0.015em]">AI Copilot</h2>
            <span className="ai-pill">
              <span className="pulse" />
              {aiInsights.length} insights
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {aiInsights.map((insight, i) => {
            const Icon = insight.icon
            return (
              <button
                key={i}
                type="button"
                onClick={insight.action}
                className="card group flex flex-col gap-4 px-6 py-7 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-mint-500/10">
                    <Icon className="h-[15px] w-[15px] text-mint-500" strokeWidth={2} />
                  </div>
                  <span className="text-[13.5px] font-semibold text-ink-900">{insight.title}</span>
                </div>
                <p className="text-[13px] leading-[1.65] text-ink-500 font-medium">{insight.text}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-mint-500">
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
    <div className="card flex items-end justify-between gap-4 px-7 py-6">
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-500">{label}</p>
        <p className={cn(
          'mt-3 text-[28px] font-bold leading-none tracking-[-0.03em]',
          warn ? 'text-amber-500' : 'text-ink-900',
        )}>
          {value}
        </p>
        <p className="mt-2.5 text-[12px] text-ink-500 font-medium truncate">{sub}</p>
      </div>
      {spark && (
        <div className="flex-shrink-0 pb-1">
          <SparkLine data={spark} width={68} height={38} area />
        </div>
      )}
    </div>
  )
}

