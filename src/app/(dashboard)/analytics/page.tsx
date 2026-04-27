'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, DollarSign, Briefcase, Users, Star,
  ArrowUpRight, ArrowDownRight, Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JOBS, CUSTOMERS, CLEANERS } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

// ─── Static mock data ──────────────────────────────────────────────────────────

function generateMonthlyData() {
  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
  const base   = [2200, 2800, 3100, 3400, 2900, 3200, 3600, 3100, 2700, 3500, 3900, 4200]
  return months.map((month, i) => ({
    month,
    revenue: base[i],
    jobs:    Math.floor(base[i] / 180),
  }))
}

const SERVICE_DATA = [
  { name: 'Standard Clean',      value: 52, color: '#6366f1' },
  { name: 'Deep Clean',          value: 24, color: '#8b5cf6' },
  { name: 'Move-Out',            value: 12, color: '#f59e0b' },
  { name: 'Airbnb',              value:  8, color: '#10b981' },
  { name: 'Post-Construction',   value:  4, color: '#ef4444' },
]

const AREA_CITIES = [
  { city: 'Long Beach',      jobs: 47, pct: 42 },
  { city: 'Torrance',        jobs: 28, pct: 25 },
  { city: 'Manhattan Beach', jobs: 18, pct: 16 },
  { city: 'Redondo Beach',   jobs: 12, pct: 11 },
  { city: 'Other',           jobs:  7, pct:  6 },
]

const AI_INSIGHTS = [
  { icon: '📈', text: 'Revenue is up 18% over the past 3 months — Long Beach growth is the primary driver.' },
  { icon: '🏆', text: 'Deep cleans have 40% higher profit margin than standard — consider promoting them more.' },
  { icon: '🔄', text: 'Client retention rate is 68% — industry avg is 55%. Your repeat business is strong.' },
  { icon: '📍', text: 'Long Beach accounts for 42% of all jobs — within your target 15-mile radius focus area.' },
]

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #1e2a3a',
    borderRadius: 10,
    color: '#f1f5f9',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' },
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('year')
  const monthlyData = useMemo(() => generateMonthlyData(), [])

  // KPI derivations from mock data
  const totalRevenue   = monthlyData.reduce((s, m) => s + m.revenue, 0)
  const totalJobs      = JOBS.length
  const completedJobs  = JOBS.filter(j => j.status === 'completed').length
  const avgJobValue    = totalJobs > 0 ? Math.round(JOBS.reduce((s, j) => s + j.price, 0) / totalJobs) : 0
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

  // Top customers by totalSpent
  const topCustomers = [...CUSTOMERS]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map(c => {
      const parts = c.name.split(' ')
      const label = parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '')
      return { name: label, value: c.totalSpent }
    })
  const maxCustomerSpend = topCustomers[0]?.value || 1

  // Team performance rows
  const teamData = (['team-a', 'team-b', 'team-c', 'team-d'] as const).map(teamId => {
    const teamCleaners = CLEANERS.filter(c => c.teamId === teamId)
    const teamJobs     = JOBS.filter(j => teamCleaners.some(c => j.cleanerIds.includes(c.id)))
    const completed    = teamJobs.filter(j => j.status === 'completed')
    const revenue      = completed.reduce((s, j) => s + j.price, 0)
    const avgRating    = teamCleaners.length
      ? teamCleaners.reduce((s, c) => s + c.rating, 0) / teamCleaners.length
      : 0
    const names: Record<string, string> = { 'team-a': 'Alpha', 'team-b': 'Beta', 'team-c': 'Gamma', 'team-d': 'Delta' }
    return {
      team:           names[teamId],
      cleaners:       teamCleaners.map(c => c.name.split(' ')[0]).join(' + '),
      jobs:           teamJobs.length,
      completed:      completed.length,
      revenue,
      completionRate: teamJobs.length > 0 ? Math.round(completed.length / teamJobs.length * 100) : 0,
      rating:         avgRating.toFixed(1),
    }
  })

  const kpis = [
    { label: 'Annual Revenue',   value: formatCurrency(totalRevenue),  change: '+18%', up: true,  icon: DollarSign, color: 'text-indigo-400' },
    { label: 'Jobs Completed',   value: completedJobs.toString(),      change: '+12%', up: true,  icon: Briefcase,  color: 'text-emerald-400' },
    { label: 'Avg Job Value',    value: formatCurrency(avgJobValue),   change: '+5%',  up: true,  icon: TrendingUp, color: 'text-violet-400' },
    { label: 'Completion Rate',  value: `${completionRate}%`,          change: '-2%',  up: false, icon: Star,       color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-7 max-w-7xl">

      {/* ── Period selector ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Analytics &amp; Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Long Beach service area · all teams</p>
        </div>
        <Tabs defaultValue="year" onValueChange={v => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="quarter">Last 3 Months</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className="kpi-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--ink-400)', textTransform: 'uppercase' }}>{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="tnum text-white mb-1" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{kpi.value}</p>
              <div className={`flex items-center gap-1 font-medium ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontSize: 12 }}>
                {kpi.up
                  ? <ArrowUpRight className="h-3.5 w-3.5" />
                  : <ArrowDownRight className="h-3.5 w-3.5" />
                }
                {kpi.change} vs last year
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Revenue trend chart ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Last 12 months · Long Beach service area</CardDescription>
              </div>
              <Badge variant="success" className="text-xs">{formatCurrency(totalRevenue)} YTD</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
                  {...TOOLTIP_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  fill="url(#revenueGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#111827', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Split row: Top Customers + Service Mix / Geographic ──────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Top Customers */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>By total spend · all time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCustomers.map((c, i) => (
                  <div key={c.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <span style={{ fontSize: 12 }} className="font-mono text-slate-600 w-4">{i + 1}</span>
                        <span className="text-slate-200 font-medium">{c.name}</span>
                      </div>
                      <span className="text-emerald-400 font-bold text-sm tnum">{formatCurrency(c.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1a2537] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(c.value / maxCustomerSpend) * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Service Mix + Geographic */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-5"
        >
          {/* Service Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Service Mix</CardTitle>
              <CardDescription>% of total jobs by service type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3.5">
                {SERVICE_DATA.map(s => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-slate-300 flex-1">{s.name}</span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-24 rounded-full bg-[#1a2537] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.value}%` }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                      </div>
                      <span style={{ fontSize: 12 }} className="text-slate-500 w-8 text-right tnum">{s.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Service Area</CardTitle>
              <CardDescription>Long Beach 15-mile radius</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3.5">
                {AREA_CITIES.map(a => (
                  <div key={a.city} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-32 flex-shrink-0">{a.city}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#1a2537] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${a.pct}%` }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      />
                    </div>
                    <span style={{ fontSize: 12 }} className="text-slate-500 w-14 text-right tnum">{a.jobs} jobs</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Team Performance ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>All-time stats by team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-6 gap-4 px-3 pb-2.5 border-b border-[#1e2a3a]" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--ink-400)', textTransform: 'uppercase' }}>
                <div className="col-span-2">Team</div>
                <div>Jobs</div>
                <div>Revenue</div>
                <div>Completion</div>
                <div>Rating</div>
              </div>

              {teamData.map((team) => (
                <div
                  key={team.team}
                  className="grid grid-cols-6 gap-4 items-center px-3 py-4 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-slate-200">Team {team.team}</p>
                    <p style={{ fontSize: 12 }} className="text-slate-600 mt-0.5">{team.cleaners}</p>
                  </div>
                  <div className="text-sm text-slate-300 tnum">{team.jobs}</div>
                  <div className="text-sm font-medium text-emerald-400 tnum">{formatCurrency(team.revenue)}</div>
                  <div>
                    <span className={`text-sm font-medium tnum ${team.completionRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {team.completionRate}%
                    </span>
                  </div>
                  <div className="text-sm text-amber-400 tnum">⭐ {team.rating}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── AI Business Summary ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="border-indigo-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-indigo-300">AI Business Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {AI_INSIGHTS.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 p-4"
                >
                  <span className="text-lg flex-shrink-0">{insight.icon}</span>
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
