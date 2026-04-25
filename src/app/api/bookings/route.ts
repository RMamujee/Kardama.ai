import { NextResponse } from 'next/server'
import { decodeBookingToken } from '@/lib/campaign-engine'
import { saveBooking, listBookings, newBookingId } from '@/lib/booking-store'
import { CUSTOMERS, CLEANERS } from '@/lib/mock-data'
import { BookingSlot } from '@/types'

// POST /api/bookings — confirm a booking slot
export async function POST(request: Request) {
  const body = await request.json() as { token: string; slot: BookingSlot; notes?: string }
  const { token, slot, notes } = body

  if (!token || !slot) {
    return NextResponse.json({ error: 'Missing token or slot' }, { status: 400 })
  }

  const decoded = decodeBookingToken(token)
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  if (new Date(decoded.expires) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  const customer = CUSTOMERS.find(c => c.id === decoded.customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const cleaners = CLEANERS.filter(c => slot.cleanerIds.includes(c.id))

  const booking = {
    id: newBookingId(),
    token,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    slot,
    cleanerIds: slot.cleanerIds,
    cleanerNames: cleaners.map(c => c.name),
    confirmedAt: new Date().toISOString(),
    status: 'confirmed' as const,
    notes,
  }

  saveBooking(booking)

  return NextResponse.json({
    bookingId: booking.id,
    customerName: booking.customerName,
    slot: booking.slot,
    cleanerNames: booking.cleanerNames,
    confirmedAt: booking.confirmedAt,
  }, { status: 201 })
}

// GET /api/bookings — list all bookings (admin)
export async function GET() {
  const bookings = listBookings()
  return NextResponse.json({ bookings, total: bookings.length })
}
