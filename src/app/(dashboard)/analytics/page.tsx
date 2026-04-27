import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs } from '@/lib/data'
import { AnalyticsClient } from './analytics-client'

export default async function AnalyticsPage() {
  await requireOwner()
  const [jobs, customers, cleaners] = await Promise.all([
    getJobs(),
    getCustomers(),
    getCleaners(),
  ])
  return <AnalyticsClient jobs={jobs} customers={customers} cleaners={cleaners} />
}
