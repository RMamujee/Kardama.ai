import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs } from '@/lib/data'
import { MessagesClient } from './messages-client'

export default async function MessagesPage() {
  await requireOwner()
  const [jobs, customers, cleaners] = await Promise.all([
    getJobs(),
    getCustomers(),
    getCleaners(),
  ])
  return <MessagesClient jobs={jobs} customers={customers} cleaners={cleaners} />
}
