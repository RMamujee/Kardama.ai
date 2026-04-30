import { Payment } from '@/types'

export interface MonthlyRevenue {
  month: string
  total: number
  zelle: number
  venmo: number
  cash: number
}

export function groupPaymentsByMonth(payments: Payment[]): MonthlyRevenue[] {
  const map: Record<string, MonthlyRevenue> = {}
  payments.forEach(p => {
    if (!map[p.month]) map[p.month] = { month: p.month, total: 0, zelle: 0, venmo: 0, cash: 0 }
    map[p.month].total += p.amount
    if (p.method) map[p.month][p.method] += p.amount
  })
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
}

export function getYtdRevenue(payments: Payment[]): number {
  const year = new Date().getFullYear().toString()
  return payments.filter(p => p.month.startsWith(year)).reduce((s, p) => s + p.amount, 0)
}

export function getMtdRevenue(payments: Payment[]): number {
  const month = new Date().toISOString().slice(0, 7)
  return payments.filter(p => p.month === month).reduce((s, p) => s + p.amount, 0)
}

export function getMtdTrend(payments: Payment[]): string | null {
  const now = new Date()
  const curr = now.toISOString().slice(0, 7)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)
  const currAmt = payments.filter(p => p.month === curr).reduce((s, p) => s + p.amount, 0)
  const prevAmt = payments.filter(p => p.month === prev).reduce((s, p) => s + p.amount, 0)
  if (prevAmt === 0) return null
  const pct = ((currAmt - prevAmt) / prevAmt) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

export function getYtdTrend(payments: Payment[]): string | null {
  const now = new Date()
  const currYear = now.getFullYear().toString()
  const prevYear = (now.getFullYear() - 1).toString()
  const currAmt = payments.filter(p => p.month.startsWith(currYear)).reduce((s, p) => s + p.amount, 0)
  const prevAmt = payments.filter(p => p.month.startsWith(prevYear)).reduce((s, p) => s + p.amount, 0)
  if (prevAmt === 0) return null
  const pct = ((currAmt - prevAmt) / prevAmt) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}
