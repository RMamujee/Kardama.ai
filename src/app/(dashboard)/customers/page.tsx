import { requireOwner } from '@/lib/supabase/dal'
import { getCustomers, getJobs, getCleaners, getPayments } from '@/lib/data'
import { CustomersClient } from './customers-client'

export default async function CustomersPage() {
  await requireOwner()
  const [customers, jobs, cleaners, payments] = await Promise.all([
    getCustomers(),
    getJobs(),
    getCleaners(),
    getPayments(),
  ])
  return <CustomersClient customers={customers} jobs={jobs} cleaners={cleaners} payments={payments} />
}
