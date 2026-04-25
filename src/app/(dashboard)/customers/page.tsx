'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Users, DollarSign, TrendingUp, Star,
  MapPin, Phone, Mail, Calendar, Sparkles, X, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { CUSTOMERS, JOBS, CLEANERS } from '@/lib/mock-data'
import { formatCurrency, getServiceLabel } from '@/lib/utils'
import { Customer } from '@/types'

const SOURCE_BADGE: Record<string, 'default' | 'success' | 'warning' | 'purple' | 'neutral'> = {
  facebook: 'default',
  yelp: 'warning',
  referral: 'success',
  text: 'neutral',
  repeat: 'purple',
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#3b82f6', '#14b8a6', '#f43f5e', '#a855f7', '#06b6d4',
  '#22c55e', '#ef4444',
]

const JOB_STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'neutral' | 'danger'> = {
  scheduled: 'default',
  confirmed: 'success',
  'in-progress': 'warning',
  completed: 'neutral',
  cancelled: 'danger',
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('all')
  const [sortBy, setSortBy] = useState('spent')
  const [selected, setSelected] = useState<Customer | null>(null)

  const cities = useMemo(
    () => ['all', ...Array.from(new Set(CUSTOMERS.map(c => c.city))).sort()],
    []
  )

  const filtered = useMemo(() => {
    let result = [...CUSTOMERS]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
      )
    }
    if (filterCity !== 'all') result = result.filter(c => c.city === filterCity)
    if (sortBy === 'spent') result.sort((a, b) => b.totalSpent - a.totalSpent)
    else if (sortBy === 'jobs') result.sort((a, b) => b.jobHistory.length - a.jobHistory.length)
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [search, filterCity, sortBy])

  const totalRevenue = CUSTOMERS.reduce((s, c) => s + c.totalSpent, 0)
  const avgJobValue =
    JOBS.length > 0 ? Math.round(JOBS.reduce((s, j) => s + j.price, 0) / JOBS.length) : 0
  const activeThisMonth = CUSTOMERS.filter(c => c.jobHistory.length > 0).length

  const stats = [
    { label: 'Total Customers', value: CUSTOMERS.length, icon: Users, color: 'text-indigo-400' },
    { label: 'Active This Month', value: activeThisMonth, icon: Calendar, color: 'text-emerald-400' },
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-violet-400' },
    { label: 'Avg Job Value', value: formatCurrency(avgJobValue), icon: TrendingUp, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className="kpi-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Insight Banner */}
      <div className="flex items-center gap-3 rounded-xl bg-indigo-500/[0.07] border border-indigo-500/20 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 flex-shrink-0">
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </div>
        <p className="text-sm text-slate-300 flex-1">
          <span className="text-indigo-400 font-medium">AI: </span>
          3 customers haven&apos;t booked in 30+ days — Sarah Mitchell, Jennifer Park, Christopher Lee.
          Consider sending a re-engagement offer.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
        >
          Send
        </Button>
      </div>

      {/* Search + Filters + Add Button */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-44">
          {cities.map(c => (
            <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>
          ))}
        </Select>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-44">
          <option value="spent">Sort: Most Spent</option>
          <option value="jobs">Sort: Most Jobs</option>
          <option value="name">Sort: Name A–Z</option>
        </Select>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer, i) => {
          const color = AVATAR_COLORS[CUSTOMERS.indexOf(customer) % AVATAR_COLORS.length]
          const initials = customer.name.split(' ').map(n => n[0]).join('')
          const jobs = JOBS.filter(j => customer.jobHistory.includes(j.id))
          const lastJob = jobs.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0]
          const preferredCleaners = CLEANERS.filter(c =>
            customer.preferredCleanerIds.includes(c.id)
          )
          const isSelected = selected?.id === customer.id

          return (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <button
                onClick={() => setSelected(isSelected ? null : customer)}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-200 group
                  ${isSelected
                    ? 'bg-[#141c2e] border-indigo-500/40 ring-1 ring-indigo-500/20'
                    : 'bg-[#111827] border-[#1e2a3a] hover:border-indigo-500/30 hover:bg-[#141c2e]'
                  }`}
              >
                {/* Header row: avatar + name + source badge */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar initials={initials} color={color} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                      {customer.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-600 flex-shrink-0" />
                      <p className="text-xs text-slate-500 truncate">{customer.city}</p>
                      <span className="text-slate-700">·</span>
                      <p className="text-xs text-slate-600">{customer.jobHistory.length} jobs</p>
                    </div>
                  </div>
                  <Badge
                    variant={SOURCE_BADGE[customer.source] ?? 'neutral'}
                    className="text-[10px] capitalize flex-shrink-0"
                  >
                    {customer.source}
                  </Badge>
                </div>

                {/* Spend + last job */}
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-bold text-emerald-400">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-slate-600">total spent</p>
                  </div>
                  {lastJob ? (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Last job</p>
                      <p className="text-xs text-slate-400">{lastJob.scheduledDate}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 italic">No jobs yet</p>
                  )}
                </div>

                {/* Preferred cleaners */}
                {preferredCleaners.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    <p className="text-[10px] text-slate-500 truncate">
                      Prefers {preferredCleaners.map(c => c.name.split(' ')[0]).join(' + ')}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {customer.notes && (
                  <p className="mt-1.5 text-[11px] text-slate-600 truncate">{customer.notes}</p>
                )}
              </button>
            </motion.div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Users className="h-8 w-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No customers match your search</p>
          </div>
        )}
      </div>

      {/* Customer Detail Slide-over */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelected(null)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-[400px] bg-[#111827] border-l border-[#1e2a3a] z-50 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)]"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#1e2a3a]">
                <div className="flex items-center gap-3">
                  <Avatar
                    initials={selected.name.split(' ').map(n => n[0]).join('')}
                    color={AVATAR_COLORS[CUSTOMERS.indexOf(selected) % AVATAR_COLORS.length]}
                    size="lg"
                  />
                  <div>
                    <p className="font-bold text-slate-100">{selected.name}</p>
                    <p className="text-xs text-slate-500">
                      {selected.city} · {selected.jobHistory.length} jobs
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Mini-stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">
                      {formatCurrency(selected.totalSpent)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Total Spent</p>
                  </div>
                  <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-3 text-center">
                    <p className="text-xl font-bold text-indigo-400">{selected.jobHistory.length}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Total Jobs</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
                  <div className="space-y-2">
                    {[
                      { icon: Phone, label: selected.phone },
                      { icon: Mail, label: selected.email },
                      { icon: MapPin, label: selected.address },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 text-sm">
                        <Icon className="h-4 w-4 text-slate-600 flex-shrink-0" />
                        <span className="text-slate-300 truncate">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source + Notes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</p>
                    <Badge
                      variant={SOURCE_BADGE[selected.source] ?? 'neutral'}
                      className="text-[10px] capitalize"
                    >
                      {selected.source}
                    </Badge>
                  </div>
                  {selected.notes && (
                    <p className="text-sm text-slate-400 italic">&ldquo;{selected.notes}&rdquo;</p>
                  )}
                </div>

                {/* Preferred Cleaners */}
                {(() => {
                  const preferred = CLEANERS.filter(c =>
                    selected.preferredCleanerIds.includes(c.id)
                  )
                  return preferred.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Preferred Cleaners
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {preferred.map(c => (
                          <div key={c.id} className="flex items-center gap-2 rounded-lg bg-[#0d1321] border border-[#1e2a3a] px-3 py-1.5">
                            <Avatar initials={c.initials} color={c.color} size="xs" />
                            <span className="text-xs text-slate-300">{c.name}</span>
                            <span className="text-[10px] text-amber-400">★ {c.rating}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Recent Jobs */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Recent Jobs
                  </p>
                  {JOBS.filter(j => selected.jobHistory.includes(j.id))
                    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
                    .slice(0, 5)
                    .map(job => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between rounded-lg bg-[#0d1321] border border-[#1e2a3a] px-3 py-2.5 hover:border-indigo-500/20 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {getServiceLabel(job.serviceType)}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-700" />
                            <p className="text-[10px] text-slate-600">
                              {job.scheduledDate} · {job.scheduledTime}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-sm font-bold text-emerald-400">${job.price}</p>
                          <Badge
                            variant={job.paid ? 'success' : 'warning'}
                            className="text-[9px]"
                          >
                            {job.paid ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {selected.jobHistory.length === 0 && (
                    <p className="text-sm text-slate-600 italic py-2 text-center">
                      No jobs yet
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-[#1e2a3a] space-y-2">
                <Button className="w-full" variant="glow">
                  <Calendar className="h-4 w-4" /> Schedule New Job
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full">
                    <Mail className="h-3.5 w-3.5" /> Message
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
