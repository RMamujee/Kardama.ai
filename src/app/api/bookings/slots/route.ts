import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/booking-tokens'
import { getAvailableSlots } from '@/lib/campaign-engine'
import { getBookedJobsForDate } from '@/lib/booking-store'
import { getCustomers, getCleaners, getJobs } from '@/lib/data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const decoded = verifyToken(token)
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  // Date-string comparison avoids UTC-midnight timezone off-by-one (LOW-1)
  const today = new Date().toISOString().split('T')[0]
  if (decoded.expires < today) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  const [customers, cleaners, jobs] = await Promise.all([getCustomers(), getCleaners(), getJobs()])
  const customer = customers.find(c => c.id === decoded.customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Include confirmed bookings so route scores and conflict-checks are accurate
  const confirmedJobs = (
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i + 1)
        return getBookedJobsForDate(d.toISOString().split('T')[0])
      })
    )
  ).flat()

  const slots = getAvailableSlots(decoded.customerId, confirmedJobs as never[], customers, cleaners, jobs)

  // Enrich each slot with cleaner first names for the public booking page.
  const cleanerName = new Map(cleaners.map(c => [c.id, c.name]))
  const slotsWithNames = slots.map(s => ({
    ...s,
    cleanerNames: s.cleanerIds.map(id => cleanerName.get(id) ?? id),
  }))

  // phone intentionally omitted — client never displays it (HIGH-3)
  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      firstName: customer.name.split(' ')[0],
      city: customer.city,
    },
    slots: slotsWithNames,
    expires: decoded.expires,
  })
}
