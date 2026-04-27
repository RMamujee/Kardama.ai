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
import { StatTile } from '@/components/ui/stat-tile'
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
  { name: 'Standard Clean',      value: 52, color: '#8B85F2' },
  { name: 'Deep Clean',          value: 24, color: '#A78BFA' },
  { name: 'Move-Out',            value: 12, color: '#FBBF24' },
  { name: 'Airbnb',              value:  8, color: '#34D399' },
  { name: 'Post-Construction',   value:  4, color: '#F87171' },
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
    background: '#111726',
    border: '1px solid #3A4258',
    borderRadius: 10,
    color: '#F2F5FA',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  labelStyle: { color: '#9099AE' },
  itemStyle: { color: '#F2F5FA' },
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
    { label: 'Annual Revenue',  value: formatCurrency(totalRevenue),  change: '+18%', up: true,  icon: DollarSign, tone: 'violet'  as const },
    { label: 'Jobs Completed',  value: completedJobs.toString(),      change: '+12%', up: true,  icon: Briefcase,  tone: 'emerald' as const },
    { label: 'Avg Job Value',   value: formatCurrency(avgJobValue),   change: '+5%',  up: true,  icon: TrendingUp, tone: 'purple'  as const },
    { label: 'Completion Rate', value: `${completionRate}%`,          change: '-2%',  up: false, icon: Star,       tone: 'amber'   as const },
  ]

  return (
    <div className="space-y-7 max-w-7xl">

      {/* ── Period selector ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-ink-900">Analytics &amp; Reports</h1>
          <p className="text-[14px] text-ink-500 mt-1">Long Beach service area · all teams</p>
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
            <StatTile
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              tone={kpi.tone}
              trend={
                <span className={`flex items-center gap-1 text-[12px] font-medium ${kpi.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {kpi.up
                    ? <ArrowUpRight className="h-3.5 w-3.5" />
                    : <ArrowDownRight className="h-3.5 w-3.5" />
                  }
                  {kpi.change}
                </span>
              }
              sub="vs last year"
            />
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
                    <stop offset="5%"  stopColor="#8B85F2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B85F2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A4258" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6E778C', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6E778C', fontSize: 12 }}
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
                  stroke="#8B85F2"
                  fill="url(#revenueGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#8B85F2', stroke: '#111726', strokeWidth: 2 }}
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
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12px] font-mono text-ink-400 w-4">{i + 1}</span>
                        <span className="text-ink-900 font-medium">{c.name}</span>
                      </div>
                      <span className="text-emerald-500 font-bold text-[14px] tnum">{formatCurrency(c.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-soft overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(c.value / maxCustomerSpend) * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500"
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
                    <span className="text-[14px] text-ink-700 flex-1">{s.name}</span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-24 rounded-full bg-soft overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.value}%` }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                      </div>
                      <span className="text-[12px] text-ink-500 w-8 text-right tnum">{s.value}%</span>
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
                    <span className="text-[14px] text-ink-700 w-32 flex-shrink-0">{a.city}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-soft overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${a.pct}%` }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                      />
                    </div>
                    <span className="text-[12px] text-ink-500 w-14 text-right tnum">{a.jobs} jobs</span>
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
              <div className="grid grid-cols-6 gap-4 px-3 pb-2.5 border-b border-ink-200 text-[11px] font-bold tracking-[0.09em] text-ink-400 uppercase">
                <div className="col-span-2">Team</div>
                <div>Jobs</div>
                <div>Revenue</div>
                <div>Completion</div>
                <div>Rating</div>
              </div>

              {teamData.map((team) => (
                <div
                  key={team.team}
                  className="grid grid-cols-6 gap-4 items-center px-3 py-4 rounded-lg hover:bg-hover transition-colors"
                >
                  <div className="col-span-2">
                    <p className="text-[14px] font-medium text-ink-900">Team {team.team}</p>
                    <p className="text-[12px] text-ink-400 mt-0.5">{team.cleaners}</p>
                  </div>
                  <div className="text-[14px] text-ink-700 tnum">{team.jobs}</div>
                  <div className="text-[14px] font-medium text-emerald-500 tnum">{formatCurrency(team.revenue)}</div>
                  <div>
                    <span className={`text-[14px] font-medium tnum ${team.completionRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {team.completionRate}%
                    </span>
                  </div>
                  <div className="text-[14px] text-amber-500 tnum">⭐ {team.rating}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── AI Business Summary ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="border-violet-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <CardTitle className="text-violet-400">AI Business Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {AI_INSIGHTS.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-[14px] bg-violet-500/[0.06] border border-violet-500/15 p-4"
                >
                  <span className="text-[18px] flex-shrink-0">{insight.icon}</span>
                  <p className="text-[14px] text-ink-700 leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  )
}
