'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Payment } from '@/types'
import { groupPaymentsByMonth } from '@/lib/payment-utils'

// Generate last 6 months of mock data
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
    // Add mock historical data
    const mock = m < new Date().toISOString().slice(0, 7) ? {
      total: 2800 + Math.floor(Math.random() * 1800),
      zelle: 1400 + Math.floor(Math.random() * 800),
      venmo: 800 + Math.floor(Math.random() * 600),
      cash: 400 + Math.floor(Math.random() * 400),
    } : { total: found.total, zelle: found.zelle, venmo: found.venmo, cash: found.cash }
    return {
      month: new Date(m + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      ...mock,
    }
  })
}

export function RevenueChart({ payments }: { payments: Payment[] }) {
  const data = buildChartData(payments)
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">Revenue — Last 6 Months</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
          <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} />
          <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
          <Tooltip
            formatter={(v) => `$${Number(v).toLocaleString()}`}
            contentStyle={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: 8, color: '#f1f5f9' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#94a3b8' }} />
          <Area type="monotone" dataKey="total" name="Total" stroke="#6366f1" fill="url(#totalGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="zelle" name="Zelle" stroke="#818cf8" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          <Area type="monotone" dataKey="venmo" name="Venmo" stroke="#8b5cf6" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          <Area type="monotone" dataKey="cash" name="Cash" stroke="#10b981" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
