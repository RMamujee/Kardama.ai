import { NextResponse } from 'next/server'
import { getBooking } from '@/lib/booking-store'

export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const booking = getBooking(bookingId)
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json(booking)
}
