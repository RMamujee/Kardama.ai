'use client'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Users, AlertCircle, Clock, Sparkles, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatTile } from '@/components/ui/stat-tile'
import type { Cleaner, Job } from '@/types'
import { formatCurrency, formatTime, getServiceLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

type DashboardData = {
  cleaners: Cleaner[]
  todayJobs: Job[]
  monthRevenue: number
  pendingRevenue: number
}

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }

const STATUS_BADGE = {
  scheduled:    'default',
  confirmed:    'success',
  'in-progress':'warning',
  completed:    'neutral',
  cancelled:    'danger',
} as const

const CLEANER_STATUS_RING: Record<string, string> = {
  available: 'bg-emerald-500',
  'en-route': 'bg-amber-500',
  cleaning:  'bg-violet-500',
  'off-duty': 'bg-ink-300',
}

const AI_INSIGHTS = [
  { tone: 'violet'  as const, icon: '📍', text: 'Team A (Maria + Carlos) is nearest to 3 Long Beach jobs this week — optimal routing saves ~45 min' },
  { tone: 'amber'   as const, icon: '💰', text: "William Foster's $380 payment has been pending 2 days — tap to send an automated reminder" },
  { tone: 'emerald' as const, icon: '📅', text: 'Next Friday has 0 jobs scheduled — historically your highest-demand day. Open a slot?' },
]

const RECENT_ACTIVITY = [
  { msg: 'Maria + Carlos completed job at Ocean Blvd', time: '2h ago', dot: 'bg-emerald-500' },
  { msg: 'Payment $380 received via Zelle from William Foster', time: '3h ago', dot: 'bg-violet-500' },
  { msg: 'New booking: Lisa Thompson — Airbnb turnover', time: '4h ago', dot: 'bg-purple-500' },
  { msg: 'Jennifer + David en route to Manhattan Beach job', time: '5h ago', dot: 'bg-amber-500' },
  { msg: 'Move-out clean completed — 987 Cherry Ave', time: '1d ago', dot: 'bg-emerald-500' },
]

export function DashboardClient({ cleaners, todayJobs, monthRevenue, pendingRevenue }: DashboardData) {
  const activeCleaners = cleaners.filter((c) => c.status !== 'off-duty').length
  const todayRevenue = todayJobs.reduce((s, j) => s + j.price, 0)
  const totalCleaners = cleaners.length || 1

  const kpis = [
    { label: "Today's Revenue", value: formatCurrency(todayRevenue),  sub: `${todayJobs.length} jobs today`,    icon: DollarSign,  tone: 'violet'  as const, trend: '+8%' },
    { label: 'Month Revenue',   value: formatCurrency(monthRevenue),  sub: '+12% vs last month',                icon: TrendingUp,  tone: 'emerald' as const, trend: '+12%' },
    { label: 'Active Cleaners', value: `${activeCleaners}/${totalCleaners}`, sub: '4 teams deployed',            icon: Users,       tone: 'purple'  as const, trend: null },
    { label: 'Pending Payments',value: formatCurrency(pendingRevenue),sub: 'Needs confirmation',                icon: AlertCircle, tone: 'amber'   as const, trend: null },
  ]

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* KPI grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp}>
            <StatTile
              label={kpi.label}
              value={kpi.value}
              sub={kpi.sub}
              icon={kpi.icon}
              tone={kpi.tone}
              trend={kpi.trend ? <Badge variant="success" dot>{kpi.trend}</Badge> : null}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid: jobs (3) + activity (2) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Today's Jobs */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today&apos;s Jobs</CardTitle>
                <Badge variant="default">{todayJobs.length} scheduled</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[420px] overflow-y-auto">
                {todayJobs.length === 0 && (
                  <p className="py-12 text-center text-[13px] text-ink-400">No jobs scheduled today</p>
                )}
                {todayJobs.map((job, idx) => {
                  const jobCleaners = cleaners.filter((c) => job.cleanerIds.includes(c.id))
                  const isLast = idx === todayJobs.length - 1
                  return (
                    <button
                      key={job.id}
                      type="button"
                      className={cn(
                        'group flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-soft sm:px-6',
                        !isLast && 'border-b border-ink-200'
                      )}
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-elev">
                        <Clock className="h-[18px] w-[18px] text-ink-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink-900">
                          {job.address.split(',')[0]}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-ink-500">
                          {formatTime(job.scheduledTime)} · {getServiceLabel(job.serviceType)} · {jobCleaners.map((c) => c.name.split(' ')[0]).join(' + ')}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <Badge variant={(STATUS_BADGE as any)[job.status] || 'neutral'} className="capitalize">
                          {job.status}
                        </Badge>
                        <span className="tnum w-12 text-right text-[14px] font-bold text-emerald-500">
                          ${job.price}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3.5">
                {RECENT_ACTIVITY.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-[7px] h-2 w-2 flex-shrink-0 rounded-full ring-[3px] ring-current/10',
                        a.dot
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-[1.5] text-ink-700">{a.msg}</p>
                      <p className="mt-0.5 text-[11px] text-ink-400">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Team status */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team Status</CardTitle>
              <span className="text-[12px] text-ink-400">{activeCleaners} of {totalCleaners} active</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {cleaners.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-200 bg-soft px-3.5 py-3 transition-colors hover:border-violet-200"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold text-page"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.initials}
                    </div>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-soft',
                        CLEANER_STATUS_RING[c.status] ?? 'bg-ink-300'
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{c.name.split(' ')[0]}</p>
                    <p className="mt-0.5 truncate text-[11px] capitalize text-ink-400">{c.homeAreaName}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Copilot */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card className="border-violet-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </div>
                <CardTitle className="text-violet-400">AI Copilot</CardTitle>
                <Badge variant="default">3 new</Badge>
              </div>
              <button
                type="button"
                className="hidden items-center gap-1 text-[12px] font-semibold text-violet-400 hover:text-violet-500 sm:inline-flex"
              >
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {AI_INSIGHTS.map((insight, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3.5 rounded-xl px-4 py-3.5 text-left transition-colors',
                      i === 0
                        ? 'bg-violet-500/10 border border-violet-500/20'
                        : 'border border-transparent hover:bg-soft'
                    )}
                  >
                    <span className="flex-shrink-0 text-lg leading-none mt-0.5">{insight.icon}</span>
                    <p className="text-[13px] leading-[1.55] text-ink-700">{insight.text}</p>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
