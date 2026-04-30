import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs, getBookingRequests, getAcceptedBookings, getTeams } from '@/lib/data'
import { SchedulingClient } from './scheduling-client'

export default async function SchedulingPage() {
  await requireOwner()
  const [cleaners, customers, jobs, bookingRequests, confirmedBookings, teams] = await Promise.all([
    getCleaners(),
    getCustomers(),
    getJobs(),
    getBookingRequests(),
    getAcceptedBookings(),
    getTeams(),
  ])
  return (
    <SchedulingClient
      cleaners={cleaners}
      customers={customers}
      jobs={jobs}
      bookingRequests={bookingRequests}
      confirmedBookings={confirmedBookings}
      teams={teams}
    />
  )
}
