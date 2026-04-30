'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Payment } from '@/types'
import { groupPaymentsByMonth } from '@/lib/payment-utils'

function buildChartData(payments: Payment[]) {
  const existing = groupPaymentsByMonth(payments)
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }
  return months.map(m => {
    const found = existing.find(e => e.month === m) || { total: 0, zelle: 0, venmo: 0, cash: 0 }
    return {
      month: new Date(m + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      total: found.total,
      zelle: found.zelle,
      venmo: found.venmo,
      cash: found.cash,
    }
  })
}

export function RevenueChart({ payments }: { payments: Payment[] }) {
  const data = buildChartData(payments)
  return (
    <div className="space-y-4">
      <h3 className="text-[13px] font-semibold text-ink-700">Revenue — Last 6 Months</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B85F2" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B85F2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#3A4258" />
          <XAxis dataKey="month" tick={{ fill: '#6E778C', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6E778C', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
          <Tooltip
            formatter={(v) => `$${Number(v).toLocaleString()}`}
            contentStyle={{ background: '#111726', border: '1px solid #3A4258', borderRadius: 8, color: '#F2F5FA' }}
            labelStyle={{ color: '#9099AE' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#9099AE' }} />
          <Area type="monotone" dataKey="total" name="Total" stroke="#8B85F2" fill="url(#totalGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="zelle" name="Zelle" stroke="#7A75E0" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          <Area type="monotone" dataKey="venmo" name="Venmo" stroke="#A78BFA" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          <Area type="monotone" dataKey="cash" name="Cash" stroke="#34D399" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
