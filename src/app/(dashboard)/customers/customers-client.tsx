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
import { formatCurrency, getServiceLabel, cn } from '@/lib/utils'
import type { Customer, Cleaner, Job } from '@/types'

type CustomersData = { customers: Customer[]; jobs: Job[]; cleaners: Cleaner[] }

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

export function CustomersClient({ customers, jobs, cleaners }: CustomersData) {
  const router = useRouter()
  const params = useSearchParams()
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('all')
  const [sortBy, setSortBy] = useState('spent')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // The Topbar "+ New → Customer" navigates here with ?new=1.
  useEffect(() => {
    if (params.get('new')) {
      setAddOpen(true)
      // Strip the param so re-navigating to /customers later doesn't re-open it.
      router.replace('/customers', { scroll: false })
    }
  }, [params, router])

  const cities = useMemo(
    () => ['all', ...Array.from(new Set(customers.map((c) => c.city))).sort()],
    [customers],
  )

  const filtered = useMemo(() => {
    let result = [...customers]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q),
      )
    }
    if (filterCity !== 'all') result = result.filter((c) => c.city === filterCity)
    if (sortBy === 'spent') result.sort((a, b) => b.totalSpent - a.totalSpent)
    else if (sortBy === 'jobs') result.sort((a, b) => b.jobHistory.length - a.jobHistory.length)
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [search, filterCity, sortBy, customers])

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)
  const avgJobValue =
    jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.price, 0) / jobs.length) : 0
  const activeThisMonth = customers.filter((c) => c.jobHistory.length > 0).length
  const inactiveCount = customers.filter((c) => {
    const last = jobs
      .filter((j) => j.customerId === c.id)
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0]
    if (!last) return false
    const days = (Date.now() - new Date(last.scheduledDate).getTime()) / 86_400_000
    return days >= 30
  }).length

  return (
    <div className="space-y-6">
      {/* ─── KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Customers"
          value={customers.length}
          sub={`${cities.length - 1} cities`}
          icon={Users}
          tone="mint"
        />
        <StatTile
          label="Active this month"
          value={activeThisMonth}
          sub={`${Math.round((activeThisMonth / Math.max(1, customers.length)) * 100)}% of base`}
          icon={Calendar}
          tone="emerald"
        />
        <StatTile
          label="Total revenue"
          value={formatCurrency(totalRevenue)}
          sub="Lifetime"
          icon={DollarSign}
          tone="mint"
        />
        <StatTile
          label="Avg job value"
          value={formatCurrency(avgJobValue)}
          sub={`${jobs.length} jobs in dataset`}
          icon={TrendingUp}
          tone="emerald"
        />
      </div>

      {/* ─── AI banner */}
      {inactiveCount > 0 && (
        <div className="card flex items-center gap-4 px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-mint-500/12">
            <Sparkles className="h-[16px] w-[16px] text-mint-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[12px] font-medium text-mint-500">AI Insight</span>
            <p className="mt-1 text-[13px] text-ink-700 leading-[1.5]">
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
          <Input
            placeholder="Search by name or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="w-44"
        >
          {cities.map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>
          ))}
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-44">
          <option value="spent">Sort: Most spent</option>
          <option value="jobs">Sort: Most jobs</option>
          <option value="name">Sort: Name A–Z</option>
        </Select>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-[15px] w-[15px]" strokeWidth={2.5} />
          Add customer
        </Button>
      </div>

      {/* ─── Customer grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((customer, i) => {
          const color = AVATAR_COLORS[customers.indexOf(customer) % AVATAR_COLORS.length]
          const initials = customer.name.split(' ').map((n) => n[0]).join('')
          const customerJobs = jobs.filter((j) => customer.jobHistory.includes(j.id))
          const lastJob = customerJobs.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0]
          const isSelected = selected?.id === customer.id

          return (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.3, i * 0.025) }}
            >
              <button
                onClick={() => setSelected(isSelected ? null : customer)}
                className={cn(
                  'card flex w-full flex-col gap-4 p-5 text-left transition-all',
                  isSelected && '!border-mint-500/60 bg-soft/60',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] text-[12px] font-semibold text-page"
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">{customer.name}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-400">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{customer.city}</span>
                      <span className="text-line-strong">·</span>
                      <span className="num">{customer.jobHistory.length} jobs</span>
                    </div>
                  </div>
                  <Badge variant={SOURCE_BADGE[customer.source] ?? 'neutral'}>
                    {customer.source}
                  </Badge>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <span className="text-[12px] text-ink-500">Spent</span>
                    <p className="num mt-1 text-[20px] font-semibold text-ink-900 leading-none tracking-[-0.02em]">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                  </div>
                  {lastJob ? (
                    <div className="text-right">
                      <span className="text-[12px] text-ink-500">Last job</span>
                      <p className="num mt-1 text-[12.5px] text-ink-500">{lastJob.scheduledDate}</p>
                    </div>
                  ) : (
                    <span className="text-[12px] text-ink-500">No jobs yet</span>
                  )}
                </div>
              </button>
            </motion.div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-ink-300" />
            <p className="text-[13.5px] text-ink-400">No customers match your filters</p>
          </div>
        )}
      </div>

      {/* ─── Detail panel */}
      <AnimatePresence>
        {selected && (
          <DetailPanel
            customer={selected}
            cleaners={cleaners}
            jobs={jobs}
            color={AVATAR_COLORS[customers.indexOf(selected) % AVATAR_COLORS.length]}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Add customer dialog */}
      <AddCustomerDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Detail panel — extracted for clarity
// ═══════════════════════════════════════════════════════════════════════════

function DetailPanel({
  customer, cleaners, jobs, color, onClose,
}: {
  customer: Customer
  cleaners: Cleaner[]
  jobs: Job[]
  color: string
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const initials = customer.name.split(' ').map((n) => n[0]).join('')
  const preferred = cleaners.filter((c) => customer.preferredCleanerIds.includes(c.id))
  const customerJobs = jobs
    .filter((j) => customer.jobHistory.includes(j.id))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))

  function handleSendLink() {
    setFeedback(null)
    startTransition(async () => {
      const result = await sendBookingLink({ customerId: customer.id })
      if (result.ok) {
        setFeedback({ kind: 'ok', msg: 'Booking link sent via SMS.' })
      } else {
        setFeedback({ kind: 'err', msg: result.error })
      }
    })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-40 bg-page/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
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
              <p className="truncate text-[14px] font-semibold text-ink-900">{customer.name}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-400">
                {customer.city} · <span className="num">{customer.jobHistory.length}</span> jobs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-ink-400 hover:bg-soft hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 text-center">
              <span className="text-[12px] text-ink-500">Total spent</span>
              <p className="num mt-2 text-[22px] font-semibold text-ink-900 leading-none tracking-[-0.02em]">
                {formatCurrency(customer.totalSpent)}
              </p>
            </div>
            <div className="card p-4 text-center">
              <span className="text-[12px] text-ink-500">Jobs</span>
              <p className="num mt-2 text-[22px] font-semibold text-ink-900 leading-none tracking-[-0.02em]">
                {customer.jobHistory.length}
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <span className="text-[12px] font-medium text-ink-500">Contact</span>
            <div className="space-y-2">
              {[
                { Icon: Phone, label: customer.phone },
                { Icon: Mail,  label: customer.email },
                { Icon: MapPin, label: customer.address },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-start gap-2.5 text-[12.5px]">
                  <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-400" />
                  <span className="text-ink-700 break-words">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Source + notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink-500">Source</span>
              <Badge variant={SOURCE_BADGE[customer.source] ?? 'neutral'}>{customer.source}</Badge>
            </div>
            {customer.notes && (
              <p className="rounded-[8px] border border-line bg-soft px-3 py-2.5 text-[12.5px] italic text-ink-500">
                "{customer.notes}"
              </p>
            )}
          </div>

          {/* Preferred cleaners */}
          {preferred.length > 0 && (
            <div className="space-y-3">
              <span className="text-[12px] font-medium text-ink-500">Preferred cleaners</span>
              <div className="flex flex-wrap gap-2">
                {preferred.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-[8px] border border-line bg-soft px-2.5 py-1.5"
                  >
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-page"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.initials}
                    </div>
                    <span className="text-[12px] text-ink-700">{c.name.split(' ')[0]}</span>
                    <span className="num text-[10.5px] text-amber-500">
                      <Star className="mr-0.5 inline h-2.5 w-2.5 fill-amber-500" />
                      {c.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent jobs */}
          <div className="space-y-3">
            <span className="text-[12px] font-medium text-ink-500">Recent jobs</span>
            {customerJobs.length === 0 ? (
              <p className="text-center text-[12.5px] italic text-ink-400 py-2">No jobs yet</p>
            ) : (
              <ul className="card overflow-hidden">
                {customerJobs.slice(0, 5).map((job, idx) => (
                  <li
                    key={job.id}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-3',
                      idx > 0 && 'border-t border-line',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink-900 truncate">
                        {getServiceLabel(job.serviceType)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ink-400">
                        <Clock className="h-2.5 w-2.5" />
                        <span className="num">{job.scheduledDate}</span>
                        <span>·</span>
                        <span className="num">{job.scheduledTime}</span>
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2.5 ml-3">
                      <span className="num text-[12.5px] font-semibold text-ink-900">${job.price}</span>
                      <Badge variant={job.paid ? 'success' : 'warning'}>
                        {job.paid ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-line p-4 space-y-3">
          {feedback && (
            <div
              className={cn(
                'rounded-[8px] border px-3 py-2 text-[12px] flex items-center gap-2',
                feedback.kind === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-500',
              )}
            >
              {feedback.kind === 'ok' && <Check className="h-3.5 w-3.5" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          <Button className="w-full" onClick={handleSendLink} disabled={isPending}>
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />}
            {isPending ? 'Sending…' : 'Text booking link'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="flex h-8 items-center justify-center gap-2 rounded-[8px] border border-line bg-elev px-3 text-[12px] font-medium text-ink-700 transition-colors hover:bg-hover hover:text-ink-900 hover:border-line-strong"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
            <a
              href={`/messages?customer=${customer.id}`}
              className="flex h-8 items-center justify-center gap-2 rounded-[8px] border border-line bg-elev px-3 text-[12px] font-medium text-ink-700 transition-colors hover:bg-hover hover:text-ink-900 hover:border-line-strong"
            >
              <Mail className="h-3.5 w-3.5" />
              Message
            </a>
          </div>
        </div>
      </motion.div>
    </>
  )
}
