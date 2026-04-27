import { requireOwner } from '@/lib/supabase/dal'
import { getCustomers, getJobs, getCleaners } from '@/lib/data'
import { CustomersClient } from './customers-client'

export default async function CustomersPage() {
  await requireOwner()
  const [customers, jobs, cleaners] = await Promise.all([
    getCustomers(),
    getJobs(),
    getCleaners(),
  ])
  return <CustomersClient customers={customers} jobs={jobs} cleaners={cleaners} />
}
