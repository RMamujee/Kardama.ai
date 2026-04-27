'use client'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Users, AlertCircle, Clock, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JOBS, CLEANERS, PAYMENTS, getTodayJobs, getMonthRevenue, getPendingRevenue } from '@/lib/mock-data'
import { formatCurrency, formatTime, getServiceLabel } from '@/lib/utils'

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const STATUS_BADGE = {
  scheduled: 'default', confirmed: 'success', 'in-progress': 'warning',
  completed: 'neutral', cancelled: 'danger',
} as const

const CLEANER_STATUS_COLOR: Record<string, string> = {
  available: '#34D399', 'en-route': '#FBBF24', cleaning: '#8B85F2', 'off-duty': '#535B70',
}

const AI_INSIGHTS = [
  { icon: '📍', text: 'Team A (Maria + Carlos) is nearest to 3 Long Beach jobs this week — optimal routing saves ~45 min' },
  { icon: '💰', text: 'William Foster\'s $380 payment has been pending 2 days — tap to send an automated reminder' },
  { icon: '📅', text: 'Next Friday has 0 jobs scheduled — historically your highest-demand day. Open a slot?' },
]

export default function DashboardPage() {
  const todayJobs = getTodayJobs()
  const monthRevenue = getMonthRevenue()
  const pendingRevenue = getPendingRevenue()
  const activeCleaners = CLEANERS.filter(c => c.status !== 'off-duty').length
  const todayRevenue = todayJobs.reduce((s, j) => s + j.price, 0)

  const kpis = [
    { label: "Today's Revenue", value: formatCurrency(todayRevenue), sub: `${todayJobs.length} jobs today`, icon: DollarSign, tint: 'var(--blue-500)', trend: '+8%' },
    { label: 'Month Revenue', value: formatCurrency(monthRevenue), sub: '+12% vs last month', icon: TrendingUp, tint: 'var(--green-500)', trend: '+12%' },
    { label: 'Active Cleaners', value: `${activeCleaners}/8`, sub: '4 teams deployed', icon: Users, tint: 'var(--violet-500)', trend: null },
    { label: 'Pending Payments', value: formatCurrency(pendingRevenue), sub: 'Needs confirmation', icon: AlertCircle, tint: 'var(--amber-500)', trend: null },
  ]

  const recentActivity = [
    { msg: 'Maria + Carlos completed job at Ocean Blvd', time: '2h ago', color: '#34D399' },
    { msg: 'Payment $380 received via Zelle from William Foster', time: '3h ago', color: '#8B85F2' },
    { msg: 'New booking: Lisa Thompson — Airbnb turnover', time: '4h ago', color: '#A78BFA' },
    { msg: 'Jennifer + David en route to Manhattan Beach job', time: '5h ago', color: '#FBBF24' },
    { msg: 'Move-out clean completed — 987 Cherry Ave', time: '1d ago', color: '#34D399' },
  ]

  return (
    <div className="space-y-7 max-w-7xl">
      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={item}>
            <div className="kpi-card rounded-xl" style={{ padding: 22 }}>
              <div className="flex items-start justify-between" style={{ marginBottom: 18 }}>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${kpi.tint}22`, color: kpi.tint }}
                >
                  <kpi.icon className="h-[18px] w-[18px]" />
                </div>
                {kpi.trend && (
                  <Badge variant="success" dot>{kpi.trend}</Badge>
                )}
              </div>
              <p className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-400)', fontWeight: 500, marginBottom: 6 }}>{kpi.label}</p>
              <p className="tnum" style={{ fontSize: 30, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>{kpi.value}</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Today's Jobs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today&apos;s Jobs</CardTitle>
                <Badge variant="default">{todayJobs.length} scheduled</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                {todayJobs.length === 0 && <p className="py-10 text-center" style={{ fontSize: 14, color: 'var(--ink-400)' }}>No jobs scheduled today</p>}
                {todayJobs.map((job, idx) => {
                  const cleaners = CLEANERS.filter(c => job.cleanerIds.includes(c.id))
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-4 cursor-pointer transition-colors duration-[120ms]"
                      style={{
                        padding: '14px 22px',
                        borderBottom: idx < todayJobs.length - 1 ? '1px solid var(--ink-200)' : 'none',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'var(--bg-elev)' }}>
                        <Clock className="h-[18px] w-[18px]" style={{ color: 'var(--ink-400)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{job.address.split(',')[0]}</p>
                        <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 3 }}>{formatTime(job.scheduledTime)} · {getServiceLabel(job.serviceType)} · {cleaners.map(c => c.name.split(' ')[0]).join(' + ')}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant={(STATUS_BADGE as any)[job.status] || 'neutral'} className="capitalize">{job.status}</Badge>
                        <span className="tnum font-bold" style={{ fontSize: 14, color: 'var(--green-500)', minWidth: 44, textAlign: 'right' }}>${job.price}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-[7px] h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: a.color, boxShadow: `0 0 0 3px ${a.color}22` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.5 }}>{a.msg}</p>
                      <p style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 3 }}>{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Team Status */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader><CardTitle>Team Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CLEANERS.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 transition-colors duration-[120ms]"
                  style={{ borderRadius: 12, background: 'var(--bg-soft)', border: '1px solid var(--ink-200)', padding: '14px 14px' }}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full font-bold"
                      style={{ backgroundColor: c.color, color: 'var(--bg-page)', fontSize: 12.5 }}
                    >
                      {c.initials}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: CLEANER_STATUS_COLOR[c.status] ?? '#535B70',
                        border: '2px solid var(--bg-soft)',
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }}>{c.name.split(' ')[0]}</p>
                    <p className="capitalize" style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>{c.homeAreaName}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card style={{ borderColor: 'var(--blue-100)' }}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'var(--blue-50)' }}
              >
                <Sparkles className="h-4 w-4" style={{ color: 'var(--blue-500)' }} />
              </div>
              <CardTitle style={{ color: 'var(--blue-400)' }}>AI Copilot</CardTitle>
              <Badge variant="default">3 new</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {AI_INSIGHTS.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 cursor-pointer transition-colors duration-[120ms]"
                  style={{
                    borderRadius: 12,
                    padding: '14px 16px',
                    background: i === 0 ? 'var(--blue-50)' : 'transparent',
                    border: `1px solid ${i === 0 ? 'var(--blue-100)' : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => { if (i !== 0) (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)' }}
                  onMouseLeave={(e) => { if (i !== 0) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span className="flex-shrink-0 text-lg leading-none mt-0.5">{insight.icon}</span>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.55 }}>{insight.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
