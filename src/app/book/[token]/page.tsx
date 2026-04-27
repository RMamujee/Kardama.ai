'use client'
import { useState, use, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Sparkles, Clock, MapPin, Calendar, Users,
  ChevronRight, Phone, Zap, Route, AlertCircle
} from 'lucide-react'
import { BookingSlot } from '@/types'
import { cn } from '@/lib/utils'

// Server-enriched slot — /api/bookings/slots adds cleanerNames so the public
// page doesn't need access to the cleaner roster.
type SlotWithCleaners = BookingSlot & { cleanerNames: string[] }

interface CustomerInfo {
  id: string
  name: string
  firstName: string
  city: string
  phone: string
}

interface SlotsResponse {
  customer: CustomerInfo
  slots: SlotWithCleaners[]
  expires: string
}

interface ConfirmedBooking {
  bookingId: string
  customerName: string
  slot: BookingSlot
  cleanerNames: string[]
  confirmedAt: string
}

export default function PublicBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<SlotsResponse | null>(null)
  const [selected, setSelected] = useState<BookingSlot | null>(null)
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/slots?token=${encodeURIComponent(token)}`)
      .then(async r => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error || 'Could not load booking slots')
        }
        return r.json() as Promise<SlotsResponse>
      })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleConfirm() {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slot: selected }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'Booking failed')
      }
      const result = await r.json() as ConfirmedBooking
      setConfirmed(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Invalid / expired ──────────────────────────────────────────────────────
  if (!loading && (error || !data)) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mx-auto">
            <Clock className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {error === 'Link expired' ? 'Link Expired' : 'Link Unavailable'}
          </h2>
          <p className="text-slate-400 text-sm">
            {error === 'Link expired'
              ? 'This booking link has expired. Contact us for a fresh one.'
              : (error || 'This link is no longer active.')}
          </p>
          <a href="tel:+15625550000" className="inline-flex items-center gap-2 mt-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <Phone className="h-4 w-4" /> Call Us to Book
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_20px_rgba(99,102,241,0.35)] mx-auto">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Book Your Cleaning</h1>
          {data && (
            <p className="text-slate-400 text-sm">
              Hey {data.customer.firstName}! Pick a time that works for you in {data.customer.city}.
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Confirmed ────────────────────────────────────────────────────── */}
          {confirmed ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-8 text-center space-y-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">You're booked!</h2>
                <p className="text-sm text-slate-400 mt-1">{confirmed.slot.label}</p>
              </div>
              <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-4 text-left space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span className="text-slate-300">{confirmed.slot.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-violet-400" />
                  <span className="text-slate-300">
                    {confirmed.cleanerNames.map(n => n.split(' ')[0]).join(' & ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span className="text-slate-300">{data?.customer.city} area</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Booking ID: <span className="font-mono text-slate-400">{confirmed.bookingId}</span>
              </p>
              <p className="text-xs text-slate-500">
                We'll send you a confirmation text. See you then! 🧹✨
              </p>
            </motion.div>

          ) : loading ? (
            /* ── Loading skeleton ──────────────────────────────────────────── */
            <motion.div key="loading" className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-[#0d1321] animate-pulse" />
              ))}
            </motion.div>

          ) : (
            /* ── Slot picker ─────────────────────────────────────────────────── */
            <motion.div key="slots" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                  Available Times — Next 7 Days
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Route className="h-3 w-3" /> Route-optimized
                </div>
              </div>

              {data?.slots.length === 0 ? (
                <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-6 text-center">
                  <AlertCircle className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No slots available this week. Please call us.</p>
                </div>
              ) : (
                data?.slots.map((slot, i) => {
                  const cleanerFirstNames = slot.cleanerNames.map(n => n.split(' ')[0])
                  const isSelected = selected?.date === slot.date && selected?.time === slot.time
                  const isOnRoute = slot.routeScore >= 70
                  const isGood = slot.routeScore >= 40

                  return (
                    <motion.button
                      key={`${slot.date}-${slot.time}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.035 }}
                      onClick={() => setSelected(slot)}
                      className={cn(
                        'w-full rounded-xl border p-4 text-left transition-all',
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_16px_rgba(99,102,241,0.2)]'
                          : 'border-[#1e2a3a] bg-[#0d1321] hover:border-[#2e3d52]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{slot.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cleanerFirstNames.join(' & ')}
                          </p>
                          {slot.insertionLabel && (
                            <div className="flex items-center gap-1 mt-1">
                              {isOnRoute ? (
                                <Zap className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                              ) : isGood ? (
                                <Route className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                              ) : null}
                              <span className={cn('text-[11px] font-medium',
                                isOnRoute ? 'text-emerald-400' : isGood ? 'text-indigo-400' : 'text-slate-500'
                              )}>
                                {slot.insertionLabel}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          'flex h-5 w-5 flex-shrink-0 mt-0.5 items-center justify-center rounded-full border-2 transition-all',
                          isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-[#2e3d52]'
                        )}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </motion.button>
                  )
                })
              )}

              {selected && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
                  >
                    {submitting
                      ? <><span className="animate-spin">⟳</span> Confirming…</>
                      : <>Confirm Booking <ChevronRight className="h-4 w-4" /></>
                    }
                  </button>
                </motion.div>
              )}

              <p className="text-[10px] text-center text-slate-600 pt-1">
                Questions? Text us at (562) 555-0100 · Kardama Cleaning
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
