/**
 * Booking persistence layer — in-memory singleton for demo/dev.
 * Swap the Map implementations for @vercel/kv (Redis) or a Postgres query in production.
 *
 * All functions are synchronous so they can be replaced with async versions
 * when wiring in a real database without changing the call sites.
 */
import { randomBytes } from 'crypto'
import { BookingSlot } from '@/types'
import { Job } from '@/types'

// ─── Stored shapes ────────────────────────────────────────────────────────────

export interface StoredBookingLink {
  token: string
  customerId: string
  createdAt: string   // ISO date
  expiresAt: string   // ISO date
}

export interface Booking {
  id: string
  token: string
  customerId: string
  customerName: string
  customerPhone: string
  customerAddress: string
  slot: BookingSlot
  cleanerIds: string[]
  cleanerNames: string[]
  confirmedAt: string  // ISO datetime
  status: 'confirmed' | 'cancelled'
  notes?: string
}

// ─── In-memory store ──────────────────────────────────────────────────────────
// Module-level Maps persist for the lifetime of the Next.js server process.

const linkStore    = new Map<string, StoredBookingLink>()
const bookingStore = new Map<string, Booking>()
const usedTokens   = new Set<string>()

// Pre-seed one booking link token so the public /book/:token page always works
// in development without having to generate one first.

// ─── Booking link CRUD ───────────────────────────────────────────────────────

export function saveBookingLink(link: StoredBookingLink): void {
  linkStore.set(link.token, link)
}

export function getBookingLink(token: string): StoredBookingLink | undefined {
  return linkStore.get(token)
}

export function listBookingLinks(): StoredBookingLink[] {
  return Array.from(linkStore.values())
}

export function isTokenUsed(token: string): boolean { return usedTokens.has(token) }
export function markTokenUsed(token: string): void   { usedTokens.add(token) }

// ─── Booking CRUD ─────────────────────────────────────────────────────────────

export function saveBooking(booking: Booking): void {
  bookingStore.set(booking.id, booking)
}

export function getBooking(id: string): Booking | undefined {
  return bookingStore.get(id)
}

export function listBookings(): Booking[] {
  return Array.from(bookingStore.values())
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
}

export function cancelBooking(id: string): Booking | undefined {
  const b = bookingStore.get(id)
  if (b) bookingStore.set(id, { ...b, status: 'cancelled' })
  return bookingStore.get(id)
}

// ─── Route conflict helper ────────────────────────────────────────────────────

/**
 * Convert confirmed bookings to partial Job objects so the route optimizer
 * and conflict checker can treat them the same as jobs from mock-data.
 */
export function getBookedJobsForDate(date: string): Pick<Job, 'cleanerIds' | 'scheduledDate' | 'scheduledTime' | 'estimatedDuration' | 'lat' | 'lng' | 'address' | 'status'>[] {
  return listBookings()
    .filter(b => b.slot.date === date && b.status === 'confirmed')
    .map(b => ({
      cleanerIds: b.cleanerIds,
      scheduledDate: b.slot.date,
      scheduledTime: b.slot.time,
      estimatedDuration: 150,
      lat: 0,   // not needed for conflict checking
      lng: 0,
      address: b.customerAddress,
      status: 'scheduled' as const,
    }))
}

// ─── ID generator ─────────────────────────────────────────────────────────────
export function newBookingId(): string {
  return `bk-${randomBytes(12).toString('base64url')}`
}
