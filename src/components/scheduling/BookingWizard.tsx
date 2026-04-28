'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles, MapPin, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useSchedulingStore } from '@/store/useSchedulingStore'
import { createJob } from '@/app/actions/scheduling'
import { formatCurrency, cn } from '@/lib/utils'
import type { Cleaner, Customer, SchedulingRequest } from '@/types'

const STEPS = ['Customer', 'Service Details', 'AI Assignment', 'Confirm']
const SERVICE_PRICES: Record<string, number> = {
  standard: 165, deep: 245, 'move-out': 380, 'post-construction': 450, airbnb: 195,
}
const SERVICE_DURATIONS: Record<string, number> = {
  standard: 180, deep: 240, 'move-out': 300, 'post-construction': 360, airbnb: 120,
}

interface Props {
  cleaners: Cleaner[]
  customers: Customer[]
}

export function BookingWizard({ cleaners, customers }: Props) {
  const router = useRouter()
  const {
    bookingStep, nextStep, prevStep, closeBooking,
    computeRecommendations, recommendations, selectedTeam, selectTeam,
  } = useSchedulingStore()
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    customerId: customers[0]?.id ?? '',
    serviceType: 'standard',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    notes: '',
  })

  const customer = customers.find(c => c.id === formData.customerId)
  const price = SERVICE_PRICES[formData.serviceType] ?? 165

  function handleComputeRecommendations() {
    if (!customer) return
    const req: SchedulingRequest = {
      jobDate: formData.date,
      jobTime: formData.time,
      jobDuration: SERVICE_DURATIONS[formData.serviceType] ?? 180,
      jobLat: customer.lat,
      jobLng: customer.lng,
      serviceType: formData.serviceType,
      customerId: formData.customerId,
      preferredCleanerIds: customer.preferredCleanerIds,
    }
    computeRecommendations(req)
    nextStep()
  }

  function handleConfirm() {
    if (!customer || !selectedTeam) return
    setSaveError(null)
    startTransition(async () => {
      try {
        await createJob({
          customerId: formData.customerId,
          cleanerIds: selectedTeam,
          scheduledDate: formData.date,
          scheduledTime: formData.time,
          estimatedDuration: SERVICE_DURATIONS[formData.serviceType] ?? 180,
          serviceType: formData.serviceType as Parameters<typeof createJob>[0]['serviceType'],
          price,
          address: customer.address,
          lat: customer.lat,
          lng: customer.lng,
          notes: formData.notes,
          driveTimeMinutes: recommendations[0]?.driveTimeMinutes ?? 15,
        })
        closeBooking()
        router.refresh()
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : 'Failed to save job')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/25 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-xl rounded-2xl bg-card border border-line-strong shadow-[0_20px_60px_-8px_rgba(0,0,0,0.14),0_8px_24px_-4px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-200 p-5">
          <div>
            <h2 className="text-[18px] font-semibold text-ink-900">New Job</h2>
            <p className="text-[13px] text-ink-500">Step {bookingStep + 1} of 4: {STEPS[bookingStep]}</p>
          </div>
          <button onClick={closeBooking} className="rounded-lg p-2 hover:bg-hover transition-colors">
            <X className="h-5 w-5 text-ink-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-ink-100">
          <div
            className="h-1 bg-violet-500 transition-all duration-300"
            style={{ width: `${(bookingStep + 1) * 25}%` }}
          />
        </div>

        {/* Steps */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            <motion.div key={bookingStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Step 0: Customer */}
              {bookingStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-ink-700">Select Customer</Label>
                    <Select value={formData.customerId} onChange={e => setFormData(d => ({ ...d, customerId: e.target.value }))} className="mt-1.5">
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                      ))}
                    </Select>
                  </div>
                  {customer && (
                    <div className="rounded-xl bg-soft border border-ink-200 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-[13px]">
                        <MapPin className="h-4 w-4 text-ink-400" />
                        <span className="text-ink-500">{customer.address}</span>
                      </div>
                      <p className="text-[12px] text-ink-400">Source: {customer.source} · {customer.jobHistory.length} prior jobs · ${customer.totalSpent} spent</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Service Details */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-ink-700">Service Type</Label>
                      <Select value={formData.serviceType} onChange={e => setFormData(d => ({ ...d, serviceType: e.target.value }))} className="mt-1.5">
                        <option value="standard">Standard Clean — $165</option>
                        <option value="deep">Deep Clean — $245</option>
                        <option value="move-out">Move-Out — $380</option>
                        <option value="post-construction">Post-Construction — $450</option>
                        <option value="airbnb">Airbnb Turnover — $195</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-ink-700">Date</Label>
                      <Input type="date" value={formData.date} onChange={e => setFormData(d => ({ ...d, date: e.target.value }))} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-ink-700">Start Time</Label>
                      <Select value={formData.time} onChange={e => setFormData(d => ({ ...d, time: e.target.value }))} className="mt-1.5">
                        {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label className="text-ink-700">Price</Label>
                      <div className="mt-1.5 flex h-9 items-center rounded-lg border border-ink-200 bg-soft px-3 text-[13px] font-semibold text-emerald-500">
                        {formatCurrency(price)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-ink-700">Notes (optional)</Label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-ink-100 bg-soft px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 resize-none focus:outline-none focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/20"
                      rows={2}
                      placeholder="Special instructions..."
                    />
                  </div>
                </div>
              )}

              {/* Step 2: AI Assignment */}
              {bookingStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 p-3">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    <p className="text-[13px] text-violet-400 font-medium">AI analyzed all teams — here are the best matches:</p>
                  </div>
                  {recommendations.map((rec, i) => {
                    const teamCleaners = rec.cleanerIds.map(id => cleaners.find(c => c.id === id)).filter(Boolean) as Cleaner[]
                    const isSelected = selectedTeam?.[0] === rec.cleanerIds[0]
                    return (
                      <button
                        key={i}
                        onClick={() => selectTeam(rec.cleanerIds)}
                        className={cn(
                          'w-full rounded-xl border-2 p-4 text-left transition-all',
                          isSelected
                            ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,133,242,0.4)]'
                            : 'border-ink-200 hover:border-ink-300 hover:bg-hover'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-1">
                              {teamCleaners.map(c => <Avatar key={c.id} initials={c.initials} color={c.color} size="sm" />)}
                            </div>
                            <div>
                              <p className="font-semibold text-ink-900 text-[13px]">{teamCleaners.map(c => c.name).join(' + ')}</p>
                              <p className="text-[12px] text-ink-500">{teamCleaners[0]?.homeAreaName} team</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn('text-[24px] font-bold', rec.score >= 80 ? 'text-emerald-500' : rec.score >= 60 ? 'text-amber-500' : 'text-rose-500')}>{rec.score}</div>
                            <div className="text-[11px] text-ink-500">AI score</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge variant="neutral" className="text-[11px]">
                            <Clock className="mr-1 h-2.5 w-2.5" />
                            {rec.driveTimeMinutes} min drive
                          </Badge>
                          {rec.matchReasons.map((r, j) => <Badge key={j} variant="success" className="text-[11px]">{r}</Badge>)}
                          {rec.warnings.map((w, j) => <Badge key={j} variant="warning" className="text-[11px]">{w}</Badge>)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 3: Confirm */}
              {bookingStep === 3 && selectedTeam && customer && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <p className="text-[13px] font-medium text-emerald-500">Ready to schedule!</p>
                  </div>
                  <div className="rounded-xl bg-soft border border-ink-200 p-4 space-y-3 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Customer</span>
                      <span className="font-medium text-ink-900">{customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Service</span>
                      <span className="font-medium text-ink-900 capitalize">{formData.serviceType} clean</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Date & Time</span>
                      <span className="font-medium text-ink-900">{formData.date} at {formData.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Team</span>
                      <span className="font-medium text-ink-900">
                        {selectedTeam.map(id => cleaners.find(c => c.id === id)?.name.split(' ')[0] ?? id).join(' + ')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-ink-200 pt-3 font-semibold">
                      <span className="text-ink-700">Total Price</span>
                      <span className="text-emerald-500">{formatCurrency(price)}</span>
                    </div>
                  </div>
                  {saveError && (
                    <p className="rounded-lg bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-[12.5px] text-rose-500">{saveError}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-ink-200 p-5">
          <Button variant="outline" onClick={bookingStep === 0 ? closeBooking : prevStep} disabled={isPending}>
            {bookingStep === 0 ? <><X className="h-4 w-4" /> Cancel</> : <><ChevronLeft className="h-4 w-4" /> Back</>}
          </Button>
          {bookingStep === 1 ? (
            <Button onClick={handleComputeRecommendations}>
              <Sparkles className="h-4 w-4" /> Get AI Recommendations
            </Button>
          ) : bookingStep === 3 ? (
            <Button onClick={handleConfirm} disabled={!selectedTeam || isPending}>
              <CheckCircle className="h-4 w-4" /> {isPending ? 'Saving…' : 'Schedule Job'}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={bookingStep === 2 && !selectedTeam}>
              {bookingStep === 2 && !selectedTeam ? 'Select a Team' : <>Next <ChevronRight className="h-4 w-4" /></>}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
