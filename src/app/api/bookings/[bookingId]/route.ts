import { NextResponse } from 'next/server'
import { getBooking } from '@/lib/booking-store'

// Requires the original booking token as proof of ownership (CRIT-5)
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const token = new URL(request.url).searchParams.get('token')

  const booking = await getBooking(bookingId)
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!token || booking.token !== token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Return only what the confirmation page needs — no raw PII
  return NextResponse.json({
    bookingId: booking.id,
    slot: booking.slot,
    cleanerNames: booking.cleanerNames,
    confirmedAt: booking.confirmedAt,
    status: booking.status,
  })
}
