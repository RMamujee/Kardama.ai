import { NextResponse } from 'next/server'
import { decodeBookingToken, getAvailableSlots } from '@/lib/campaign-engine'
import { getBookedJobsForDate } from '@/lib/booking-store'
import { CUSTOMERS } from '@/lib/mock-data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const decoded = decodeBookingToken(token)
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  if (new Date(decoded.expires) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  const customer = CUSTOMERS.find(c => c.id === decoded.customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Collect confirmed bookings across the next 8 days so route scores are accurate
  const today = new Date()
  const confirmedJobs = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i + 1)
    return getBookedJobsForDate(d.toISOString().split('T')[0])
  }).flat()

  const slots = getAvailableSlots(decoded.customerId, confirmedJobs as any)

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      firstName: customer.name.split(' ')[0],
      city: customer.city,
      phone: customer.phone,
    },
    slots,
    expires: decoded.expires,
  })
}
