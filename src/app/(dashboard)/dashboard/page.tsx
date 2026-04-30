import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getTodayJobs, getMonthRevenue, getPendingRevenue, getRevenueHistory } from '@/lib/data'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  await requireOwner()
  const [cleaners, todayJobs, monthRevenue, pendingRevenue, revenueHistory] = await Promise.all([
    getCleaners(),
    getTodayJobs(),
    getMonthRevenue(),
    getPendingRevenue(),
    getRevenueHistory(),
  ])
  return (
    <DashboardClient
      cleaners={cleaners}
      todayJobs={todayJobs}
      monthRevenue={monthRevenue}
      pendingRevenue={pendingRevenue}
      revenueHistory={revenueHistory}
    />
  )
}
