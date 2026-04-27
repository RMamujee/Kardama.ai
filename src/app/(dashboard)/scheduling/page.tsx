import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs } from '@/lib/data'
import { SchedulingClient } from './scheduling-client'

export default async function SchedulingPage() {
  await requireOwner()
  const [cleaners, customers, jobs] = await Promise.all([
    getCleaners(),
    getCustomers(),
    getJobs(),
  ])
  return <SchedulingClient cleaners={cleaners} customers={customers} jobs={jobs} />
}
