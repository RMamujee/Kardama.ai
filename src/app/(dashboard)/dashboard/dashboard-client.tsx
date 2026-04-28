'use client'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, Users, AlertCircle, Clock, Sparkles,
  ArrowUpRight, Route, MapPin, Receipt, Calendar,
} from 'lucide-react'
import { StatTile } from '@/components/ui/stat-tile'
import { Badge } from '@/components/ui/badge'
import type { Cleaner, Job } from '@/types'
import { formatCurrency, formatTime, getServiceLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

type DashboardData = {
  cleaners: Cleaner[]
  todayJobs: Job[]
  monthRevenue: number
  pendingRevenue: number
}

const fadeUp = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32 } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }

const STATUS_VARIANT: Record<Job['status'], 'default' | 'success' | 'warning' | 'neutral' | 'danger'> = {
  scheduled:    'default',
  confirmed:    'success',
  'in-progress':'warning',
  completed:    'neutral',
  cancelled:    'danger',
}

const CLEANER_STATUS_RING: Record<string, string> = {
  available:  'bg-emerald-500',
  'en-route': 'bg-amber-500',
  cleaning:   'bg-mint-500',
  'off-duty': 'bg-ink-300',
}

const AI_INSIGHTS = [
  {
    icon: Route,
    title: 'Route optimization',
    text: 'Team A (Maria + Carlos) is nearest to 3 Long Beach jobs this week — optimal routing saves ~45 min',
    cta: 'Apply',
  },
  {
    icon: Receipt,
    title: 'Pending payment',
    text: "William Foster's $380 payment has been pending 2 days — tap to send an automated reminder",
    cta: 'Send reminder',
  },
  {
    icon: Calendar,
    title: 'Open capacity',
    text: 'Next Friday has 0 jobs scheduled — historically your highest-demand day. Open a slot?',
    cta: 'Add capacity',
  },
]

const RECENT_ACTIVITY = [
  { msg: 'Maria + Carlos completed job at Ocean Blvd',          time: '2h ago', dot: 'bg-emerald-500' },
  { msg: 'Payment $380 received via Zelle from William Foster', time: '3h ago', dot: 'bg-mint-500' },
  { msg: 'New booking: Lisa Thompson — Airbnb turnover',        time: '4h ago', dot: 'bg-mint-500' },
  { msg: 'Jennifer + David en route to Manhattan Beach job',    time: '5h ago', dot: 'bg-amber-500' },
  { msg: 'Move-out clean completed — 987 Cherry Ave',           time: '1d ago', dot: 'bg-emerald-500' },
]

export function DashboardClient({ cleaners, todayJobs, monthRevenue, pendingRevenue }: DashboardData) {
  const activeCleaners = cleaners.filter((c) => c.status !== 'off-duty').length
  const todayRevenue = todayJobs.reduce((s, j) => s + j.price, 0)
  const totalCleaners = cleaners.length || 1

  return (
    <div className="space-y-6">
      {/* ─── KPI strip — 4-up on wide screens, 2-up on tablet, 1-up on phone */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <motion.div variants={fadeUp}>
          <StatTile
            label="Today's Revenue"
            value={formatCurrency(todayRevenue)}
            sub={`${todayJobs.length} jobs scheduled`}
            icon={DollarSign}
            tone="mint"
            trend={<Badge variant="success" dot>+8%</Badge>}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            label="Month Revenue"
            value={formatCurrency(monthRevenue)}
            sub="+12% vs last month"
            icon={TrendingUp}
            tone="emerald"
            trend={<Badge variant="success" dot>+12%</Badge>}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            label="Active Cleaners"
            value={`${activeCleaners} / ${totalCleaners}`}
            sub="4 teams deployed"
            icon={Users}
            tone="mint"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            label="Pending Payments"
            value={formatCurrency(pendingRevenue)}
            sub="Awaiting confirmation"
            icon={AlertCircle}
            tone="amber"
            trend={pendingRevenue > 0 ? <Badge variant="warning" dot>flag</Badge> : null}
          />
        </motion.div>
      </motion.div>

      {/* ─── Main split: jobs feed (3) + activity (1) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {/* Today's Jobs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="xl:col-span-3"
        >
          <div className="card-tile flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <h2 className="text-[14px] font-semibold text-ink-900 tracking-[-0.005em]">Today's Jobs</h2>
                <span className="num text-[11.5px] text-ink-400">{todayJobs.length} scheduled</span>
              </div>
              <button
                type="button"
                className="hidden sm:inline-flex items-center gap-1 text-[11.5px] font-medium text-mint-500 hover:text-mint-400"
              >
                Schedule
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {todayJobs.length === 0 && (
              <p className="px-6 py-12 text-center text-[13px] text-ink-400">No jobs scheduled today</p>
            )}

            <div className="max-h-[460px] overflow-y-auto">
              {todayJobs.map((job, idx) => {
                const jobCleaners = cleaners.filter((c) => job.cleanerIds.includes(c.id))
                const isLast = idx === todayJobs.length - 1
                return (
                  <button
                    key={job.id}
                    type="button"
                    className={cn(
                      'group flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-soft sm:px-6',
                      !isLast && 'border-b border-line',
                    )}
                  >
                    {/* Time block — tight mono */}
                    <div className="flex w-14 flex-shrink-0 flex-col items-start">
                      <span className="num text-[14px] font-semibold text-ink-900 leading-none">
                        {formatTime(job.scheduledTime).split(' ')[0]}
                      </span>
                      <span className="num mt-1 text-[10px] font-medium uppercase text-ink-400 tracking-widest">
                        {formatTime(job.scheduledTime).split(' ')[1]}
                      </span>
                    </div>

                    {/* Vertical hairline */}
                    <div className="h-9 w-px bg-line flex-shrink-0" />

                    {/* Address + meta */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink-900">
                        {job.address.split(',')[0]}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-400">
                        <span className="grid-label !text-[10px]">{getServiceLabel(job.serviceType)}</span>
                        <span className="text-line-strong">·</span>
                        <span className="truncate">
                          {jobCleaners.map((c) => c.name.split(' ')[0]).join(' + ')}
                        </span>
                      </div>
                    </div>

                    {/* Status + price */}
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <Badge variant={STATUS_VARIANT[job.status] ?? 'neutral'}>
                        {job.status}
                      </Badge>
                      <span className="num w-14 text-right text-[14px] font-semibold text-ink-900">
                        ${job.price}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Activity */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="card-tile flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <h2 className="text-[14px] font-semibold text-ink-900 tracking-[-0.005em]">Activity</h2>
              <span className="grid-label">Live</span>
            </div>
            <ul className="flex-1 px-5 py-4 sm:px-6">
              {RECENT_ACTIVITY.map((a, i) => (
                <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="relative mt-[7px] flex-shrink-0">
                    <span className={cn('block h-1.5 w-1.5 rounded-full', a.dot)} />
                    {i < RECENT_ACTIVITY.length - 1 && (
                      <span className="absolute left-1/2 top-3 h-7 w-px -translate-x-1/2 bg-line" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-[1.5] text-ink-700">{a.msg}</p>
                    <p className="mt-0.5 text-[10.5px] font-mono uppercase tracking-wider text-ink-400">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>

      {/* ─── Team status — full-bleed grid */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="card-tile">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-[14px] font-semibold text-ink-900 tracking-[-0.005em]">Team Status</h2>
            <div className="flex items-center gap-3">
              <span className="grid-label">{activeCleaners} of {totalCleaners} active</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {cleaners.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 bg-card px-5 py-4 transition-colors hover:bg-soft"
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-[6px] font-mono text-[11.5px] font-semibold text-page"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.initials}
                  </div>
                  <span
                    aria-label={c.status}
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                      CLEANER_STATUS_RING[c.status] ?? 'bg-ink-300',
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink-900">{c.name.split(' ')[0]}</p>
                  <p className="mt-0.5 truncate font-mono text-[10.5px] uppercase tracking-wider text-ink-400">
                    {c.homeAreaName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── AI Copilot — operations panel, not a friendly card */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="card-tile">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-mint-500/10">
                <Sparkles className="h-[14px] w-[14px] text-mint-500" strokeWidth={2.25} />
              </div>
              <h2 className="text-[14px] font-semibold text-ink-900 tracking-[-0.005em]">AI Copilot</h2>
              <Badge variant="default">3 new</Badge>
            </div>
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1 text-[11.5px] font-medium text-mint-500 hover:text-mint-400"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <ul className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
            {AI_INSIGHTS.map((insight, i) => {
              const Icon = insight.icon
              return (
                <li key={i} className="bg-card">
                  <button
                    type="button"
                    className="group flex h-full w-full flex-col items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-soft sm:px-6 sm:py-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-mint-500/10">
                        <Icon className="h-3.5 w-3.5 text-mint-500" strokeWidth={2} />
                      </div>
                      <span className="grid-label !text-mint-500/80">{insight.title}</span>
                    </div>
                    <p className="text-[13px] leading-[1.55] text-ink-700">{insight.text}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-mint-500 group-hover:text-mint-400">
                      {insight.cta}
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </motion.div>
    </div>
  )
}
