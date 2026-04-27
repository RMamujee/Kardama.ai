import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getTodayJobs, getMonthRevenue, getPendingRevenue } from '@/lib/data'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  await requireOwner()
  const [cleaners, todayJobs, monthRevenue, pendingRevenue] = await Promise.all([
    getCleaners(),
    getTodayJobs(),
    getMonthRevenue(),
    getPendingRevenue(),
  ])
  return (
    <DashboardClient
      cleaners={cleaners}
      todayJobs={todayJobs}
      monthRevenue={monthRevenue}
      pendingRevenue={pendingRevenue}
    />
  )
}
