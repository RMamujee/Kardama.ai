'use client'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Users, AlertCircle, Clock, Sparkles, ArrowUpRight, MapPin } from 'lucide-react'
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

const CLEANER_STATUS_COLOR = {
  available: '#10b981', 'en-route': '#f59e0b', cleaning: '#6366f1', 'off-duty': '#374151',
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
    { label: "Today's Revenue", value: formatCurrency(todayRevenue), sub: `${todayJobs.length} jobs today`, icon: DollarSign, color: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]', trend: '+8%' },
    { label: 'Month Revenue', value: formatCurrency(monthRevenue), sub: '+12% vs last month', icon: TrendingUp, color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]', trend: '+12%' },
    { label: 'Active Cleaners', value: `${activeCleaners}/8`, sub: '4 teams deployed', icon: Users, color: 'text-violet-400', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]', trend: null },
    { label: 'Pending Payments', value: formatCurrency(pendingRevenue), sub: 'Needs confirmation', icon: AlertCircle, color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]', trend: null },
  ]

  const recentActivity = [
    { msg: 'Maria + Carlos completed job at Ocean Blvd', time: '2h ago', color: 'bg-emerald-500' },
    { msg: 'Payment $380 received via Zelle from William Foster', time: '3h ago', color: 'bg-indigo-500' },
    { msg: 'New booking: Lisa Thompson — Airbnb turnover', time: '4h ago', color: 'bg-violet-500' },
    { msg: 'Jennifer + David en route to Manhattan Beach job', time: '5h ago', color: 'bg-amber-500' },
    { msg: 'Move-out clean completed — 987 Cherry Ave', time: '1d ago', color: 'bg-emerald-500' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={item}>
            <div className={`kpi-card rounded-xl p-5 ${kpi.glow}`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a2537]">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{kpi.sub}</p>
                {kpi.trend && (
                  <div className="flex items-center gap-0.5 text-emerald-400 text-xs font-medium">
                    <ArrowUpRight className="h-3 w-3" />
                    {kpi.trend}
                  </div>
                )}
              </div>
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
            <CardContent>
              <div className="space-y-2">
                {todayJobs.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No jobs scheduled today</p>}
                {todayJobs.map((job) => {
                  const cleaners = CLEANERS.filter(c => job.cleanerIds.includes(c.id))
                  return (
                    <div key={job.id} className="flex items-center gap-3 rounded-lg bg-[#0d1321] border border-[#1e2a3a] p-3 hover:border-indigo-500/20 hover:bg-[#111827] transition-all cursor-pointer group">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a2537] flex-shrink-0">
                        <Clock className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{job.address.split(',')[0]}</p>
                        <p className="text-xs text-slate-500">{formatTime(job.scheduledTime)} · {getServiceLabel(job.serviceType)} · {cleaners.map(c => c.name.split(' ')[0]).join(' + ')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={(STATUS_BADGE as any)[job.status] || 'neutral'} className="capitalize text-[10px]">{job.status}</Badge>
                        <span className="text-sm font-bold text-emerald-400">${job.price}</span>
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
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${a.color}`} />
                    <div>
                      <p className="text-sm text-slate-300 leading-snug">{a.msg}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{a.time}</p>
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
                <div key={c.id} className="flex items-center gap-2.5 rounded-lg bg-[#0d1321] border border-[#1e2a3a] p-3 hover:border-indigo-500/20 transition-colors">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-black/30" style={{ backgroundColor: c.color }}>
                      {c.initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d1321]"
                      style={{ backgroundColor: (CLEANER_STATUS_COLOR as any)[c.status] || '#374151' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{c.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-slate-600 capitalize">{c.homeAreaName}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="border-indigo-500/20 bg-gradient-to-br from-[#111827] to-[#0f1424]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <CardTitle className="text-indigo-300">AI Insights</CardTitle>
              <Badge variant="default" className="text-[10px]">3 new</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {AI_INSIGHTS.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-indigo-500/[0.07] border border-indigo-500/15 p-3 hover:border-indigo-500/25 transition-colors cursor-pointer">
                  <span className="text-base flex-shrink-0">{insight.icon}</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
