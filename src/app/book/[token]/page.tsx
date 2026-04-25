'use client'
import { useState, use, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Sparkles, Clock, MapPin, Calendar, Users, ChevronRight, Phone } from 'lucide-react'
import { decodeBookingToken, getAvailableSlots } from '@/lib/campaign-engine'
import { CUSTOMERS, CLEANERS } from '@/lib/mock-data'
import { BookingSlot } from '@/types'
import { cn } from '@/lib/utils'

export default function PublicBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [selected, setSelected] = useState<BookingSlot | null>(null)
  const [booked, setBooked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    const decoded = decodeBookingToken(token)
    if (!decoded) { setInvalid(true); setLoading(false); return }

    const customer = CUSTOMERS.find(c => c.id === decoded.customerId)
    if (!customer) { setInvalid(true); setLoading(false); return }

    setCustomerName(customer.name.split(' ')[0])
    setCustomerCity(customer.city)

    // Simulate async slot fetch
    setTimeout(() => {
      const available = getAvailableSlots(decoded.customerId)
      setSlots(available)
      setLoading(false)
    }, 800)
  }, [token])

  function handleBook() {
    if (!selected) return
    setBooked(true)
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mx-auto">
            <Clock className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Link Expired</h2>
          <p className="text-slate-400 text-sm">This booking link is no longer valid. Please contact us for a new link.</p>
          <a href="tel:+15625550000" className="inline-flex items-center gap-2 mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
            <Phone className="h-4 w-4" /> Call Us
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
          {customerName && (
            <p className="text-slate-400 text-sm">
              Hey {customerName}! Pick a time that works for you in {customerCity}.
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {booked ? (
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
                <p className="text-sm text-slate-400 mt-1">{selected?.label}</p>
              </div>
              <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-4 text-left space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span className="text-slate-300">{selected?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-violet-400" />
                  <span className="text-slate-300">
                    {CLEANERS.filter(c => selected?.cleanerIds.includes(c.id)).map(c => c.name.split(' ')[0]).join(' & ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span className="text-slate-300">{customerCity} area</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                We'll send you a confirmation text shortly. See you then! 🧹✨
              </p>
            </motion.div>
          ) : loading ? (
            <motion.div key="loading" className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-[#0d1321] animate-pulse" />
              ))}
            </motion.div>
          ) : (
            <motion.div key="slots" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                Available Times — Next 7 Days
              </p>

              {slots.length === 0 ? (
                <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-6 text-center text-sm text-slate-500">
                  No available slots found. Please call us to schedule.
                </div>
              ) : (
                slots.map((slot, i) => {
                  const cleaners = CLEANERS.filter(c => slot.cleanerIds.includes(c.id))
                  const isSelected = selected?.date === slot.date && selected?.time === slot.time
                  const efficiency = slot.routeScore >= 70 ? '⚡ Route-efficient' : slot.routeScore >= 40 ? '✓ Good slot' : null

                  return (
                    <motion.button
                      key={`${slot.date}-${slot.time}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelected(slot)}
                      className={cn(
                        'w-full rounded-xl border p-4 text-left transition-all',
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_16px_rgba(99,102,241,0.2)]'
                          : 'border-[#1e2a3a] bg-[#0d1321] hover:border-[#2e3d52]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{slot.label}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {cleaners.map(c => c.name.split(' ')[0]).join(' & ')}
                            </span>
                            {efficiency && (
                              <span className="text-[10px] text-emerald-400 font-medium">{efficiency}</span>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
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
                    onClick={handleBook}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
                  >
                    Confirm Booking <ChevronRight className="h-4 w-4" />
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
