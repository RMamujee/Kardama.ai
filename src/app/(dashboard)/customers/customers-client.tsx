'use client'
import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Users, DollarSign, TrendingUp, Star,
  MapPin, Phone, Mail, Calendar, Sparkles, X, Clock, Send, Loader2, Check,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatTile } from '@/components/ui/stat-tile'
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog'
import { sendBookingLink } from '@/app/actions/customers'
import { formatCurrency, getServiceLabel, customerCode, cn } from '@/lib/utils'
import type { Customer, Cleaner, Job, Payment } from '@/types'

type CustomersData = { customers: Customer[]; jobs: Job[]; cleaners: Cleaner[]; payments: Payment[] }

const SOURCE_BADGE: Record<string, 'default' | 'success' | 'warning' | 'neutral'> = {
  facebook: 'default',
  yelp:     'warning',
  referral: 'success',
  text:     'neutral',
  repeat:   'default',
}

const AVATAR_COLORS = [
  '#5EEAD4', '#34D399', '#F5A524', '#F472B6', '#60A5FA',
  '#A78BFA', '#FB923C', '#22D3EE', '#FACC15', '#94A3B8',
]

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

export function CustomersClient({ customers, jobs, cleaners, payments }: CustomersData) {
  const router = useRouter()
  const params = useSearchParams()
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('all')
  const [sortBy, setSortBy] = useState('revenue')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (params.get('new')) {
      setAddOpen(true)
      router.replace('/customers', { scroll: false })
    }
  }, [params, router])

  const cities = useMemo(
    () => ['all', ...Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).sort()],
    [customers],
  )

  // Per-customer confirmed revenue from payments
  const confirmedRevenueByCustomer = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      if (p.status === 'confirmed' && p.customerId) {
        map.set(p.customerId, (map.get(p.customerId) ?? 0) + p.amount)
      }
    }
    return map
  }, [payments])

  // Per-customer next upcoming job
  const nextJobByCustomer = useMemo(() => {
    const map = new Map<string, Job>()
    const upcoming = jobs
      .filter(j => j.scheduledDate > today && j.status !== 'cancelled')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
    for (const j of upcoming) {
      if (!map.has(j.customerId)) map.set(j.customerId, j)
    }
    return map
  }, [jobs])

  // Per-customer all jobs
  const jobsByCustomer = useMemo(() => {
    const map = new Map<string, Job[]>()
    for (const j of jobs) {
      const list = map.get(j.customerId) ?? []
      list.push(j)
      map.set(j.customerId, list)
    }
    return map
  }, [jobs])

  const filtered = useMemo(() => {
    let result = [...customers]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q),
      )
    }
    if (filterCity !== 'all') result = result.filter(c => c.city === filterCity)
    if (sortBy === 'revenue') result.sort((a, b) => (confirmedRevenueByCustomer.get(b.id) ?? 0) - (confirmedRevenueByCustomer.get(a.id) ?? 0))
    else if (sortBy === 'jobs') result.sort((a, b) => (jobsByCustomer.get(b.id)?.length ?? 0) - (jobsByCustomer.get(a.id)?.length ?? 0))
    else if (sortBy === 'next') {
      result.sort((a, b) => {
        const na = nextJobByCustomer.get(a.id)?.scheduledDate ?? 'zzz'
        const nb = nextJobByCustomer.get(b.id)?.scheduledDate ?? 'zzz'
        return na.localeCompare(nb)
      })
    }
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [search, filterCity, sortBy, customers, confirmedRevenueByCustomer, jobsByCustomer, nextJobByCustomer])

  const totalConfirmedRevenue = useMemo(
    () => [...confirmedRevenueByCustomer.values()].reduce((s, v) => s + v, 0),
    [confirmedRevenueByCustomer],
  )
  const activeThisMonth = useMemo(
    () => customers.filter(c => (jobsByCustomer.get(c.id) ?? []).some(j => j.scheduledDate.startsWith(thisMonth))).length,
    [customers, jobsByCustomer],
  )
  const inactiveCount = useMemo(
    () => customers.filter(c => {
      const cJobs = jobsByCustomer.get(c.id) ?? []
      if (cJobs.length === 0) return false
      const last = cJobs.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0]
      return (Date.now() - new Date(last.scheduledDate).getTime()) / 86_400_000 >= 30
    }).length,
    [customers, jobsByCustomer],
  )

  return (
    <div className="space-y-8">
      {/* ─── KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:gap-5">
        <StatTile label="Customers" value={customers.length} sub={`${cities.length - 1} cities`} icon={Users} tone="mint" />
        <StatTile label="Active this month" value={activeThisMonth} sub={`${Math.round((activeThisMonth / Math.max(1, customers.length)) * 100)}% of base`} icon={Calendar} tone="emerald" />
        <StatTile label="Confirmed revenue" value={formatCurrency(totalConfirmedRevenue)} sub="Lifetime" icon={DollarSign} tone="mint" />
        <StatTile label="Avg revenue" value={formatCurrency(Math.round(totalConfirmedRevenue / Math.max(1, customers.filter(c => (confirmedRevenueByCustomer.get(c.id) ?? 0) > 0).length)))} sub="Per paying customer" icon={TrendingUp} tone="emerald" />
      </div>

      {/* ─── Re-engagement banner */}
      {inactiveCount > 0 && (
        <div className="card flex items-center gap-5 px-6 py-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] bg-mint-500/12">
            <Sparkles className="h-[16px] w-[16px] text-mint-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-mint-500">AI Insight</span>
            <p className="mt-1.5 text-[13px] text-ink-700 leading-[1.6]">
              <span className="num font-semibold text-ink-900">{inactiveCount}</span> customers haven't booked in 30+ days. Send re-engagement texts in one click.
            </p>
          </div>
          <Button variant="default" size="sm" onClick={() => router.push('/campaigns')}>
            Send campaign
          </Button>
        </div>
      )}

      {/* ─── Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input placeholder="Search by name, phone, email or address…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-40">
          {cities.map(c => <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>)}
        </Select>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-44">
          <option value="revenue">Sort: Most revenue</option>
          <option value="jobs">Sort: Most jobs</option>
          <option value="next">Sort: Next cleaning</option>
          <option value="name">Sort: Name A–Z</option>
        </Select>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-[15px] w-[15px]" strokeWidth={2.5} />
          Add customer
        </Button>
      </div>

      {/* ─── Customer table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-soft/40">
                {['Customer', 'Contact', 'Next Cleaning', 'Revenue', 'Jobs', 'Source'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-soft">
                      <Users className="h-4.5 w-4.5 text-ink-400" />
                    </div>
                    <p className="text-[13.5px] font-medium text-ink-700">
                      {search || filterCity !== 'all' ? 'No customers match your filters' : 'No customers yet'}
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-400">
                      {search || filterCity !== 'all' ? 'Try adjusting your search.' : 'Customers are added automatically from the intake form.'}
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((customer, i) => {
                const color = AVATAR_COLORS[customers.indexOf(customer) % AVATAR_COLORS.length]
                const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                const nextJob = nextJobByCustomer.get(customer.id)
                const jobCount = jobsByCustomer.get(customer.id)?.length ?? 0
                const revenue = confirmedRevenueByCustomer.get(customer.id) ?? 0
                const isSelected = selected?.id === customer.id

                return (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(0.25, i * 0.02) }}
                    onClick={() => setSelected(isSelected ? null : customer)}
                    className={cn(
                      'cursor-pointer border-b border-line transition-colors last:border-0',
                      isSelected ? 'bg-mint-500/8' : 'hover:bg-soft/60',
                    )}
                  >
                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[7px] text-[11px] font-semibold text-page"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[13px] font-semibold text-ink-900">{customer.name}</p>
                            <span className="num flex-shrink-0 text-[10.5px] text-ink-400">{customerCode(customer.id)}</span>
                          </div>
                          {customer.city && (
                            <p className="flex items-center gap-1 text-[11.5px] text-ink-500 mt-0.5">
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="truncate">{customer.city}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-[12px] text-ink-700">
                          <Phone className="h-3 w-3 flex-shrink-0 text-ink-400" />
                          {customer.phone}
                        </p>
                        <p className="flex items-center gap-1.5 text-[12px] text-ink-500 truncate max-w-[200px]">
                          <Mail className="h-3 w-3 flex-shrink-0 text-ink-400" />
                          {customer.email}
                        </p>
                      </div>
                    </td>

                    {/* Next Cleaning */}
                    <td className="px-4 py-3.5">
                      {nextJob ? (
                        <div>
                          <p className="num text-[12.5px] font-medium text-ink-900">{nextJob.scheduledDate}</p>
                          <p className="mt-0.5 text-[11.5px] text-ink-500">{getServiceLabel(nextJob.serviceType)}</p>
                        </div>
                      ) : (
                        <span className="text-[12px] text-ink-400">—</span>
                      )}
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3.5">
                      <span className={cn('num text-[13px] font-semibold', revenue > 0 ? 'text-emerald-500' : 'text-ink-400')}>
                        {revenue > 0 ? formatCurrency(revenue) : '—'}
                      </span>
                    </td>

                    {/* Jobs */}
                    <td className="px-4 py-3.5">
                      <span className="num text-[13px] text-ink-700">{jobCount}</span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3.5">
                      <Badge variant={SOURCE_BADGE[customer.source] ?? 'neutral'}>{customer.source}</Badge>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Detail panel */}
      <AnimatePresence>
        {selected && (
          <DetailPanel
            customer={selected}
            cleaners={cleaners}
            jobs={jobsByCustomer.get(selected.id) ?? []}
            confirmedRevenue={confirmedRevenueByCustomer.get(selected.id) ?? 0}
            color={AVATAR_COLORS[customers.indexOf(selected) % AVATAR_COLORS.length]}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      <AddCustomerDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Detail panel
// ═══════════════════════════════════════════════════════════════════════════

function DetailPanel({
  customer, cleaners, jobs, confirmedRevenue, color, onClose,
}: {
  customer: Customer
  cleaners: Cleaner[]
  jobs: Job[]
  confirmedRevenue: number
  color: string
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const preferred = cleaners.filter(c => customer.preferredCleanerIds.includes(c.id))
  const sortedJobs = [...jobs].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
  const nextJob = jobs.filter(j => j.scheduledDate > today && j.status !== 'cancelled').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]

  function handleSendLink() {
    setFeedback(null)
    startTransition(async () => {
      const result = await sendBookingLink({ customerId: customer.id })
      setFeedback(result.ok ? { kind: 'ok', msg: 'Booking link sent via SMS.' } : { kind: 'err', msg: result.error })
    })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-40 bg-page/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-line-strong bg-card shadow-[var(--shadow-pop)] sm:w-[420px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[13px] font-semibold text-page"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[14px] font-semibold text-ink-900">{customer.name}</p>
                <span className="num flex-shrink-0 rounded-[5px] bg-soft px-1.5 py-0.5 text-[10.5px] text-ink-500">{customerCode(customer.id)}</span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-ink-500">
                {customer.city} · <span className="num">{jobs.length}</span> jobs
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-[8px] text-ink-400 hover:bg-soft hover:text-ink-900">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-line-strong">
            <div className="border-r border-line px-4 py-4">
              <span className="eyebrow">Revenue</span>
              <p className="num mt-2.5 text-[18px] font-semibold text-emerald-500 leading-none tracking-[-0.02em]">
                {formatCurrency(confirmedRevenue)}
              </p>
            </div>
            <div className="border-r border-line px-4 py-4">
              <span className="eyebrow">Jobs</span>
              <p className="num mt-2.5 text-[18px] font-semibold text-ink-900 leading-none tracking-[-0.02em]">
                {jobs.length}
              </p>
            </div>
            <div className="px-4 py-4">
              <span className="eyebrow">Next</span>
              {nextJob ? (
                <p className="num mt-2.5 text-[13px] font-semibold text-ink-900 leading-tight">
                  {nextJob.scheduledDate}
                </p>
              ) : (
                <p className="mt-2.5 text-[13px] text-ink-400">—</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <span className="eyebrow">Contact</span>
            <div className="space-y-2.5">
              {[
                { Icon: Phone, label: customer.phone },
                { Icon: Mail, label: customer.email },
                { Icon: MapPin, label: customer.address },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-start gap-3 text-[12.5px]">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[6px] bg-soft mt-0.5">
                    <Icon className="h-3 w-3 text-ink-400" />
                  </div>
                  <span className="text-ink-700 break-words leading-[1.55]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Source + notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Source</span>
              <Badge variant={SOURCE_BADGE[customer.source] ?? 'neutral'}>{customer.source}</Badge>
            </div>
            {customer.notes && (
              <p className="rounded-[8px] border border-line bg-soft/60 px-3.5 py-3 text-[12.5px] italic text-ink-500 leading-[1.6]">
                "{customer.notes}"
              </p>
            )}
          </div>

          {/* Preferred cleaners */}
          {preferred.length > 0 && (
            <div className="space-y-3">
              <span className="eyebrow">Preferred cleaners</span>
              <div className="flex flex-wrap gap-2">
                {preferred.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-[8px] border border-line bg-soft px-2.5 py-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-page" style={{ backgroundColor: c.color }}>
                      {c.initials}
                    </div>
                    <span className="text-[12px] text-ink-700">{c.name.split(' ')[0]}</span>
                    <span className="num text-[12px] text-amber-500">
                      <Star className="mr-0.5 inline h-3 w-3 fill-amber-500" />{c.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job history */}
          <div className="space-y-3">
            <span className="eyebrow">Job history</span>
            {sortedJobs.length === 0 ? (
              <p className="text-center text-[12.5px] italic text-ink-400 py-2">No jobs yet</p>
            ) : (
              <ul className="card overflow-hidden">
                {sortedJobs.slice(0, 6).map((job, idx) => (
                  <li key={job.id} className={cn('flex items-center justify-between px-3.5 py-3', idx > 0 && 'border-t border-line')}>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink-900 truncate">{getServiceLabel(job.serviceType)}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-500">
                        <Clock className="h-2.5 w-2.5" />
                        <span className="num">{job.scheduledDate}</span>
                        <span>·</span>
                        <span className="num">{job.scheduledTime}</span>
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2.5 ml-3">
                      <span className="num text-[12.5px] font-semibold text-ink-900">${job.price}</span>
                      <Badge variant={job.paid ? 'success' : 'warning'}>{job.paid ? 'Paid' : 'Pending'}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line p-5 space-y-3">
          {feedback && (
            <div className={cn('rounded-[8px] border px-3 py-2 text-[12px] flex items-center gap-2',
              feedback.kind === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-rose-500/30 bg-rose-500/10 text-rose-500')}>
              {feedback.kind === 'ok' && <Check className="h-3.5 w-3.5" />}
              <span>{feedback.msg}</span>
            </div>
          )}
          <Button className="w-full" onClick={handleSendLink} disabled={isPending}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isPending ? 'Sending…' : 'Text booking link'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${customer.phone}`} className="flex h-8 items-center justify-center gap-2 rounded-[8px] border border-line bg-elev px-3 text-[12px] font-medium text-ink-700 transition-colors hover:bg-hover hover:text-ink-900 hover:border-line-strong">
              <Phone className="h-3.5 w-3.5" />Call
            </a>
            <a href={`/messages?customer=${customer.id}`} className="flex h-8 items-center justify-center gap-2 rounded-[8px] border border-line bg-elev px-3 text-[12px] font-medium text-ink-700 transition-colors hover:bg-hover hover:text-ink-900 hover:border-line-strong">
              <Mail className="h-3.5 w-3.5" />Message
            </a>
          </div>
        </div>
      </motion.div>
    </>
  )
}
