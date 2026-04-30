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
