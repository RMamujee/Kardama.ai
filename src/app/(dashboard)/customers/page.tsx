import { requireOwner } from '@/lib/supabase/dal'
import { getCustomers, getJobs, getCleaners, getPayments, getCustomerBookingRequests } from '@/lib/data'
import { CustomersClient } from './customers-client'

export default async function CustomersPage() {
  await requireOwner()
  const [customers, jobs, cleaners, payments, bookingRequests] = await Promise.all([
    getCustomers(),
    getJobs(),
    getCleaners(),
    getPayments(),
    getCustomerBookingRequests(),
  ])
  return <CustomersClient customers={customers} jobs={jobs} cleaners={cleaners} payments={payments} bookingRequests={bookingRequests} />
}
