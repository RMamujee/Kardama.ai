'use client'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, AlertCircle, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { StatTile } from '@/components/ui/stat-tile'
import { usePaymentStore } from '@/store/usePaymentStore'
import { LogPaymentModal } from '@/components/payments/LogPaymentModal'
import { RevenueChart } from '@/components/payments/RevenueChart'
import { formatCurrency } from '@/lib/utils'
import { getMtdRevenue, getYtdRevenue } from '@/lib/payment-utils'
import type { Cleaner, Customer, Job, Payment } from '@/types'

type PaymentsData = {
  customers: Customer[]
  jobs: Job[]
  payments: Payment[]
  cleaners: Cleaner[]
}

const METHOD_BADGE: Record<string, 'default' | 'success' | 'neutral'> = {
  zelle: 'default',
  venmo: 'default',
  cash:  'success',
}

const STATUS_VARIANT: Record<string, 'warning' | 'default' | 'success' | 'neutral'> = {
  pending:   'warning',
  received:  'default',
  confirmed: 'success',
  cancelled: 'neutral',
}

export function PaymentsClient({ customers, jobs, payments: serverPayments }: PaymentsData) {
  const {
    payments, setPayments,
    filterMethod, filterStatus, searchQuery, logModalOpen,
    setFilterMethod, setFilterStatus, setSearchQuery,
    openLogModal, confirmPayment, getFiltered,
  } = usePaymentStore()

  // Hydrate store from server-fetched data on mount
  useEffect(() => {
    setPayments(serverPayments)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = getFiltered()
  const mtd = getMtdRevenue(payments)
  const ytd = getYtdRevenue(payments)
  const pending = jobs.filter(j => !j.paid && j.status === 'completed').reduce((s, j) => s + j.price, 0)

  const stats = [
    { label: 'Month Revenue', value: formatCurrency(mtd), icon: DollarSign, tone: 'mint' as const, trend: '+14%' },
    { label: 'Year Revenue', value: formatCurrency(ytd), icon: TrendingUp, tone: 'emerald' as const, trend: '+21%' },
    { label: 'Pending', value: formatCurrency(pending), icon: AlertCircle, tone: 'amber' as const, trend: null },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatTile
              label={s.label}
              value={s.value}
              icon={s.icon}
              tone={s.tone}
              sub={s.trend ? <span className="text-emerald-500">{s.trend} vs last period</span> : undefined}
            />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="card">
        <Tabs defaultValue="transactions">
          <div className="flex items-center justify-between px-5 pt-4 border-b border-line">
            <TabsList>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="chart">Revenue Chart</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={openLogModal}>
              <Plus className="h-[15px] w-[15px]" strokeWidth={2.5} /> Log Payment
            </Button>
          </div>

          <TabsContent value="transactions">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 px-5 py-4 border-b border-line">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
                <Input
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterMethod} onChange={e => setFilterMethod(e.target.value as typeof filterMethod)} className="w-36">
                <option value="all">All methods</option>
                <option value="zelle">Zelle</option>
                <option value="venmo">Venmo</option>
                <option value="cash">Cash</option>
              </Select>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className="w-36">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    {['Date', 'Customer', 'Amount', 'Method', 'Status', 'Notes', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[12px] font-medium text-ink-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-[13px] text-ink-400">No payments found</td></tr>
                  )}
                  {filtered.map((p) => {
                    const customer = customers.find(c => c.id === p.customerId)
                    const methodVariant = p.method ? (METHOD_BADGE[p.method] || 'neutral') : 'neutral'
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-line transition-colors hover:bg-soft last:border-0"
                      >
                        <td className="px-4 py-3.5 num text-[13px] text-ink-400">{p.receivedAt.split('T')[0]}</td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-ink-900">{customer?.name || 'Unknown'}</td>
                        <td className="px-4 py-3.5 num text-[13px] font-semibold text-emerald-500">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3.5">
                          {p.method ? (
                            <Badge variant={methodVariant} dot>
                              {p.method.charAt(0).toUpperCase() + p.method.slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-[12px] text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={STATUS_VARIANT[p.status] || 'neutral'}>{p.status}</Badge>
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px] truncate text-[12px] text-ink-400">{p.confirmationNote}</td>
                        <td className="px-4 py-3.5">
                          {p.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmPayment(p.id)}
                              className="text-emerald-500 hover:text-emerald-500"
                            >
                              Mark Received
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="chart">
            <div className="p-5">
              <RevenueChart payments={payments} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {logModalOpen && <LogPaymentModal customers={customers} jobs={jobs} />}
    </div>
  )
}
