'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Sparkles, Calendar, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

const SERVICE_OPTIONS = [
  { value: 'standard', label: 'Standard Clean', price: '$165' },
  { value: 'deep', label: 'Deep Clean', price: '$245' },
  { value: 'move-out', label: 'Move-Out Clean', price: '$380' },
  { value: 'post-construction', label: 'Post-Construction', price: '$450' },
  { value: 'airbnb', label: 'Airbnb Turnover', price: '$195' },
]

const ALL_TIMES = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
]

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function addDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

type FormState = {
  customer_name: string
  customer_phone: string
  customer_email: string
  address: string
  city: string
  service_type: string
  preferred_date: string
  preferred_time: string
  notes: string
}

export default function RequestPage() {
  const [form, setForm] = useState<FormState>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    address: '',
    city: '',
    service_type: 'standard',
    preferred_date: tomorrow(),
    preferred_time: '09:00',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({})

  // Fetch booked slots for the next 90 days so we can block taken times
  useEffect(() => {
    fetch(`/api/availability?from=${tomorrow()}&to=${addDays(90)}`)
      .then(r => r.json())
      .then(({ bookedSlots: slots }) => {
        if (slots) setBookedSlots(slots)
      })
      .catch(() => {})
  }, [])

  // When the date changes, auto-select the first available time for that date
  function handleDateChange(date: string) {
    const takenOnDay = bookedSlots[date] ?? []
    const available = ALL_TIMES.find(t => !takenOnDay.includes(t.value))
    set('preferred_date', date)
    if (available && takenOnDay.includes(form.preferred_time)) {
      set('preferred_time', available.value)
    }
  }

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const takenOnSelectedDay = bookedSlots[form.preferred_date] ?? []
  const selectedTimeBooked = takenOnSelectedDay.includes(form.preferred_time)
  const availableTimesOnDay = ALL_TIMES.filter(t => !takenOnSelectedDay.includes(t.value))
  const dayFullyBooked = availableTimesOnDay.length === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTimeBooked) {
      setError('That time slot is no longer available. Please choose another time.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submission failed')
      setBookingId(json.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedService = SERVICE_OPTIONS.find(s => s.value === form.service_type)
  const selectedTime = ALL_TIMES.find(t => t.value === form.preferred_time)

  if (bookingId) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-8 text-center space-y-5"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Request Received!</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Thanks {form.customer_name.split(' ')[0]}! We&apos;ll review your request and confirm your appointment via text or email.
            </p>
          </div>
          <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-4 text-left space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Calendar className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">{selectedService?.label}</p>
                <p className="text-slate-400">
                  {new Date(form.preferred_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime?.label}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Phone className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-400">{form.customer_phone}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Reference ID: <span className="font-mono text-slate-500">{bookingId.slice(0, 8)}</span>
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_20px_rgba(99,102,241,0.35)] mx-auto">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Request a Cleaning</h1>
          <p className="text-slate-400 text-sm">Pick your date and time — we&apos;ll confirm within 24 hours.</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact info */}
          <div className="rounded-2xl bg-[#0d1321] border border-[#1e2a3a] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Info</p>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Full Name" required>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" required>
                  <input
                    type="tel"
                    value={form.customer_phone}
                    onChange={e => set('customer_phone', e.target.value)}
                    placeholder="(562) 555-0100"
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={form.customer_email}
                    onChange={e => set('customer_email', e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Address" required>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="123 Main St, Long Beach, CA 90802"
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="City">
                <input
                  type="text"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Long Beach"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Service + scheduling */}
          <div className="rounded-2xl bg-[#0d1321] border border-[#1e2a3a] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Service & Scheduling</p>
            <Field label="Service Type" required>
              <div className="grid grid-cols-1 gap-2">
                {SERVICE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('service_type', opt.value)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition-all',
                      form.service_type === opt.value
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-[#1e2a3a] text-slate-400 hover:border-[#2e3d52] hover:text-slate-300',
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className={cn(
                      'text-xs font-semibold',
                      form.service_type === opt.value ? 'text-indigo-400' : 'text-slate-600',
                    )}>{opt.price}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Preferred Date" required>
                <input
                  type="date"
                  value={form.preferred_date}
                  min={tomorrow()}
                  onChange={e => handleDateChange(e.target.value)}
                  required
                  className={cn(inputCls, dayFullyBooked && 'border-red-500/50')}
                />
                {dayFullyBooked ? (
                  <p className="mt-1 text-[11px] text-red-400">Fully booked — please choose another date</p>
                ) : takenOnSelectedDay.length > 0 ? (
                  <p className="mt-1 text-[11px] text-amber-400">
                    {availableTimesOnDay.length} of {ALL_TIMES.length} time slots available
                  </p>
                ) : null}
              </Field>

              <Field label="Preferred Time" required>
                <select
                  value={form.preferred_time}
                  onChange={e => set('preferred_time', e.target.value)}
                  required
                  className={cn(inputCls, selectedTimeBooked && 'border-red-500/50')}
                >
                  {ALL_TIMES.map(t => {
                    const taken = takenOnSelectedDay.includes(t.value)
                    return (
                      <option key={t.value} value={t.value} disabled={taken}>
                        {t.label}{taken ? ' — Taken' : ''}
                      </option>
                    )
                  })}
                </select>
                {selectedTimeBooked && (
                  <p className="mt-1 text-[11px] text-red-400">This slot is taken — pick another time</p>
                )}
              </Field>
            </div>

            <Field label="Notes & Special Instructions">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Gate code, pets, areas to focus on, parking instructions, allergies…"
                rows={3}
                maxLength={500}
                className={cn(inputCls, 'resize-none')}
              />
              <p className="mt-1 text-[11px] text-slate-600">Include anything useful for your cleaner — access codes, pets, priorities.</p>
            </Field>
          </div>

          <button
            type="submit"
            disabled={submitting || dayFullyBooked || selectedTimeBooked}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><span className="animate-spin inline-block">⟳</span> Sending…</>
            ) : dayFullyBooked ? (
              'Date fully booked — choose another'
            ) : selectedTimeBooked ? (
              'Time slot taken — choose another'
            ) : (
              <>Request Appointment <Sparkles className="h-4 w-4" /></>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-600">
            We&apos;ll confirm your appointment within 24 hours · Kardama Cleaning
          </p>
        </form>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg bg-[#0a0f1e] border border-[#1e2a3a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400">
        {label}{required && <span className="text-indigo-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
