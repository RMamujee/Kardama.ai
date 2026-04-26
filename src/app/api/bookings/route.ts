import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/booking-tokens'
import { getAvailableSlots } from '@/lib/campaign-engine'
import { saveBooking, listBookings, newBookingId, getBookedJobsForDate, isTokenUsed, markTokenUsed } from '@/lib/booking-store'
import { CUSTOMERS, CLEANERS } from '@/lib/mock-data'
import { BookingSlot } from '@/types'

const VALID_TIMES = new Set(['08:00', '09:00', '10:00', '11:00', '13:00', '14:00'])

// POST /api/bookings — confirm a booking slot
export async function POST(request: Request) {
  const body = await request.json() as { token: string; slot: BookingSlot; notes?: string }
  const { token, slot } = body

  if (!token || !slot) {
    return NextResponse.json({ error: 'Missing token or slot' }, { status: 400 })
  }

  const decoded = verifyToken(token)
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]
  if (decoded.expires < today) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  // Prevent duplicate bookings from the same link (HIGH-4)
  if (isTokenUsed(token)) {
    return NextResponse.json({ error: 'Booking already made with this link' }, { status: 409 })
  }

  const customer = CUSTOMERS.find(c => c.id === decoded.customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Lightweight slot validation — reject obviously forged slot payloads (MED-1)
  if (
    !slot.date || !slot.time || !Array.isArray(slot.cleanerIds) ||
    !VALID_TIMES.has(slot.time) ||
    slot.date <= today ||
    slot.cleanerIds.length === 0 ||
    !slot.cleanerIds.every(id => CLEANERS.some(c => c.id === id))
  ) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
  }

  // Re-derive available slots server-side and verify the submitted slot is in them (MED-1)
  const confirmedJobs = getBookedJobsForDate(slot.date)
  const validSlots = getAvailableSlots(decoded.customerId, confirmedJobs as never[])
  const match = validSlots.find(
    s => s.date === slot.date && s.time === slot.time &&
         s.cleanerIds.slice().sort().join() === slot.cleanerIds.slice().sort().join()
  )
  if (!match) return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 })

  // Cap notes to prevent store flooding (MED-2)
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : undefined

  const cleaners = CLEANERS.filter(c => match.cleanerIds.includes(c.id))

  const booking = {
    id: newBookingId(),
    token,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    slot: match,
    cleanerIds: match.cleanerIds,
    cleanerNames: cleaners.map(c => c.name),
    confirmedAt: new Date().toISOString(),
    status: 'confirmed' as const,
    notes,
  }

  markTokenUsed(token)
  saveBooking(booking)

  return NextResponse.json({
    bookingId: booking.id,
    customerName: booking.customerName,
    slot: booking.slot,
    cleanerNames: booking.cleanerNames,
    confirmedAt: booking.confirmedAt,
  }, { status: 201 })
}

// GET /api/bookings — admin only (CRIT-4)
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const bookings = listBookings()
  return NextResponse.json({ bookings, total: bookings.length })
}
