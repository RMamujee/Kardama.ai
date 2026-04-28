import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs, getBookingRequests } from '@/lib/data'
import { SchedulingClient } from './scheduling-client'

export default async function SchedulingPage() {
  await requireOwner()
  const [cleaners, customers, jobs, bookingRequests] = await Promise.all([
    getCleaners(),
    getCustomers(),
    getJobs(),
    getBookingRequests(),
  ])
  return (
    <SchedulingClient
      cleaners={cleaners}
      customers={customers}
      jobs={jobs}
      bookingRequests={bookingRequests}
    />
  )
}
