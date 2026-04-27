/**
 * Booking persistence layer.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are
 * set in the environment (production / preview deployments). Falls back to
 * in-memory Maps for local dev so the demo still works without a Redis instance.
 *
 * All public functions are async so the storage backend can change without
 * touching call sites.
 */
import { randomBytes } from 'crypto'
import { Redis } from '@upstash/redis'
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

// ─── Backend selection ────────────────────────────────────────────────────────

interface Backend {
  saveBooking(b: Booking): Promise<void>
  getBooking(id: string): Promise<Booking | undefined>
  listBookings(): Promise<Booking[]>
  cancelBooking(id: string): Promise<Booking | undefined>
  isTokenUsed(token: string): Promise<boolean>
  markTokenUsed(token: string): Promise<void>
  saveBookingLink(link: StoredBookingLink): Promise<void>
  getBookingLink(token: string): Promise<StoredBookingLink | undefined>
  listBookingLinks(): Promise<StoredBookingLink[]>
}

// ── Memory backend (local dev, demos) ────────────────────────────────────────

function makeMemoryBackend(): Backend {
  const linkStore    = new Map<string, StoredBookingLink>()
  const bookingStore = new Map<string, Booking>()
  const usedTokens   = new Set<string>()

  return {
    async saveBooking(b)        { bookingStore.set(b.id, b) },
    async getBooking(id)        { return bookingStore.get(id) },
    async listBookings()        { return Array.from(bookingStore.values()) },
    async cancelBooking(id) {
      const b = bookingStore.get(id)
      if (b) bookingStore.set(id, { ...b, status: 'cancelled' })
      return bookingStore.get(id)
    },
    async isTokenUsed(token)    { return usedTokens.has(token) },
    async markTokenUsed(token)  { usedTokens.add(token) },
    async saveBookingLink(link) { linkStore.set(link.token, link) },
    async getBookingLink(token) { return linkStore.get(token) },
    async listBookingLinks()    { return Array.from(linkStore.values()) },
  }
}

// ── Redis backend (production) ───────────────────────────────────────────────

const KEY_BOOKING       = (id: string)    => `booking:${id}`
const KEY_BOOKING_INDEX = 'bookings:index'           // SET of booking ids
const KEY_USED_TOKENS   = 'tokens:used'              // SET of used tokens
const KEY_LINK          = (token: string) => `link:${token}`
const KEY_LINK_INDEX    = 'links:index'              // SET of link tokens

function makeRedisBackend(): Backend {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  return {
    async saveBooking(b) {
      await Promise.all([
        redis.set(KEY_BOOKING(b.id), b),
        redis.sadd(KEY_BOOKING_INDEX, b.id),
      ])
    },
    async getBooking(id) {
      const b = await redis.get<Booking>(KEY_BOOKING(id))
      return b ?? undefined
    },
    async listBookings() {
      const ids = await redis.smembers(KEY_BOOKING_INDEX)
      if (ids.length === 0) return []
      const bookings = await Promise.all(ids.map(id => redis.get<Booking>(KEY_BOOKING(id))))
      return bookings.filter((b): b is Booking => !!b)
    },
    async cancelBooking(id) {
      const existing = await redis.get<Booking>(KEY_BOOKING(id))
      if (!existing) return undefined
      const updated: Booking = { ...existing, status: 'cancelled' }
      await redis.set(KEY_BOOKING(id), updated)
      return updated
    },
    async isTokenUsed(token) {
      const member = await redis.sismember(KEY_USED_TOKENS, token)
      return member === 1
    },
    async markTokenUsed(token) {
      await redis.sadd(KEY_USED_TOKENS, token)
    },
    async saveBookingLink(link) {
      await Promise.all([
        redis.set(KEY_LINK(link.token), link),
        redis.sadd(KEY_LINK_INDEX, link.token),
      ])
    },
    async getBookingLink(token) {
      const link = await redis.get<StoredBookingLink>(KEY_LINK(token))
      return link ?? undefined
    },
    async listBookingLinks() {
      const tokens = await redis.smembers(KEY_LINK_INDEX)
      if (tokens.length === 0) return []
      const links = await Promise.all(tokens.map(t => redis.get<StoredBookingLink>(KEY_LINK(t))))
      return links.filter((l): l is StoredBookingLink => !!l)
    },
  }
}

const backend: Backend =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? makeRedisBackend()
    : makeMemoryBackend()

// ─── Public API (async) ───────────────────────────────────────────────────────

export const saveBookingLink   = (link: StoredBookingLink) => backend.saveBookingLink(link)
export const getBookingLink    = (token: string)            => backend.getBookingLink(token)
export const listBookingLinks  = ()                          => backend.listBookingLinks()
export const isTokenUsed       = (token: string)            => backend.isTokenUsed(token)
export const markTokenUsed     = (token: string)            => backend.markTokenUsed(token)
export const saveBooking       = (b: Booking)               => backend.saveBooking(b)
export const getBooking        = (id: string)               => backend.getBooking(id)
export const listBookings      = async (): Promise<Booking[]> => {
  const all = await backend.listBookings()
  return all.sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
}
export const cancelBooking     = (id: string)               => backend.cancelBooking(id)

// ─── Route conflict helper ────────────────────────────────────────────────────

export async function getBookedJobsForDate(date: string): Promise<Pick<Job, 'cleanerIds' | 'scheduledDate' | 'scheduledTime' | 'estimatedDuration' | 'lat' | 'lng' | 'address' | 'status'>[]> {
  const all = await listBookings()
  return all
    .filter(b => b.slot.date === date && b.status === 'confirmed')
    .map(b => ({
      cleanerIds: b.cleanerIds,
      scheduledDate: b.slot.date,
      scheduledTime: b.slot.time,
      estimatedDuration: 150,
      lat: 0,
      lng: 0,
      address: b.customerAddress,
      status: 'scheduled' as const,
    }))
}

// ─── ID generator ─────────────────────────────────────────────────────────────
export function newBookingId(): string {
  return `bk-${randomBytes(12).toString('base64url')}`
}
