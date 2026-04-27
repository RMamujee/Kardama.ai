import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs, getPayments } from '@/lib/data'
import { PaymentsClient } from './payments-client'

export default async function PaymentsPage() {
  await requireOwner()
  const [customers, jobs, payments, cleaners] = await Promise.all([
    getCustomers(),
    getJobs(),
    getPayments(),
    getCleaners(),
  ])
  return (
    <PaymentsClient
      customers={customers}
      jobs={jobs}
      payments={payments}
      cleaners={cleaners}
    />
  )
}
