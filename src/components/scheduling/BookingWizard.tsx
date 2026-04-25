'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles, MapPin, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useSchedulingStore } from '@/store/useSchedulingStore'
import { CLEANERS, CUSTOMERS } from '@/lib/mock-data'
import { formatCurrency, cn } from '@/lib/utils'
import { SchedulingRequest } from '@/types'

const STEPS = ['Customer', 'Service Details', 'AI Assignment', 'Confirm']
const SERVICE_PRICES: Record<string, number> = {
  standard: 165, deep: 245, 'move-out': 380, 'post-construction': 450, airbnb: 195
}

export function BookingWizard() {
  const { bookingStep, nextStep, prevStep, closeBooking, computeRecommendations, recommendations, selectedTeam, selectTeam, addJob } = useSchedulingStore()

  const [formData, setFormData] = useState({
    customerId: 'cust1',
    serviceType: 'standard',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    notes: '',
  })

  const customer = CUSTOMERS.find(c => c.id === formData.customerId)
  const price = SERVICE_PRICES[formData.serviceType] || 165

  const durations: Record<string, number> = { standard: 180, deep: 240, 'move-out': 300, 'post-construction': 360, airbnb: 120 }

  function handleComputeRecommendations() {
    if (!customer) return
    const req: SchedulingRequest = {
      jobDate: formData.date,
      jobTime: formData.time,
      jobDuration: durations[formData.serviceType] || 180,
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
    addJob({
      customerId: formData.customerId,
      cleanerIds: selectedTeam,
      scheduledDate: formData.date,
      scheduledTime: formData.time,
      estimatedDuration: durations[formData.serviceType] || 180,
      status: 'scheduled',
      serviceType: formData.serviceType as any,
      price,
      paid: false,
      address: customer.address,
      lat: customer.lat,
      lng: customer.lng,
      notes: formData.notes,
      driveTimeMinutes: recommendations[0]?.driveTimeMinutes || 15,
    })
    closeBooking()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-xl rounded-2xl bg-[#111827] border border-[#1e2a3a] shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e2a3a] p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">New Job</h2>
            <p className="text-sm text-slate-500">Step {bookingStep + 1} of 4: {STEPS[bookingStep]}</p>
          </div>
          <button onClick={closeBooking} className="rounded-lg p-2 hover:bg-white/[0.05] transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-[#1e2a3a]">
          <div
            className="h-1 bg-indigo-500 transition-all duration-300"
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
                    <Label className="text-slate-300">Select Customer</Label>
                    <Select value={formData.customerId} onChange={e => setFormData(d => ({ ...d, customerId: e.target.value }))} className="mt-1.5">
                      {CUSTOMERS.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                      ))}
                    </Select>
                  </div>
                  {customer && (
                    <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-400">{customer.address}</span>
                      </div>
                      <p className="text-xs text-slate-600">Source: {customer.source} · {customer.jobHistory.length} prior jobs · ${customer.totalSpent} spent</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Service Details */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-300">Service Type</Label>
                      <Select value={formData.serviceType} onChange={e => setFormData(d => ({ ...d, serviceType: e.target.value }))} className="mt-1.5">
                        <option value="standard">Standard Clean — $165</option>
                        <option value="deep">Deep Clean — $245</option>
                        <option value="move-out">Move-Out — $380</option>
                        <option value="post-construction">Post-Construction — $450</option>
                        <option value="airbnb">Airbnb Turnover — $195</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Date</Label>
                      <Input type="date" value={formData.date} onChange={e => setFormData(d => ({ ...d, date: e.target.value }))} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-slate-300">Start Time</Label>
                      <Select value={formData.time} onChange={e => setFormData(d => ({ ...d, time: e.target.value }))} className="mt-1.5">
                        {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Price</Label>
                      <div className="mt-1.5 flex h-9 items-center rounded-lg border border-[#1e2a3a] bg-[#0d1321] px-3 text-sm font-semibold text-emerald-400">
                        {formatCurrency(price)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Notes (optional)</Label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-[#1e2a3a] bg-[#0d1321] px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      rows={2}
                      placeholder="Special instructions..."
                    />
                  </div>
                </div>
              )}

              {/* Step 2: AI Assignment */}
              {bookingStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <p className="text-sm text-indigo-300 font-medium">AI analyzed all 4 teams — here are the best matches:</p>
                  </div>
                  {recommendations.map((rec, i) => {
                    const cleaners = rec.cleanerIds.map(id => CLEANERS.find(c => c.id === id)!).filter(Boolean)
                    const isSelected = selectedTeam?.[0] === rec.cleanerIds[0]
                    return (
                      <button
                        key={i}
                        onClick={() => selectTeam(rec.cleanerIds)}
                        className={cn(
                          'w-full rounded-xl border-2 p-4 text-left transition-all',
                          isSelected
                            ? 'border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]'
                            : 'border-[#1e2a3a] hover:border-[#2d3f56] hover:bg-white/[0.02]'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-1">
                              {cleaners.map(c => <Avatar key={c.id} initials={c.initials} color={c.color} size="sm" />)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100 text-sm">{cleaners.map(c=>c.name).join(' + ')}</p>
                              <p className="text-xs text-slate-500">{cleaners[0]?.homeAreaName} team</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn('text-2xl font-bold', rec.score >= 80 ? 'text-emerald-400' : rec.score >= 60 ? 'text-amber-400' : 'text-red-400')}>{rec.score}</div>
                            <div className="text-[10px] text-slate-500">AI score</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge variant="neutral" className="text-[10px]">
                            <Clock className="mr-1 h-2.5 w-2.5" />
                            {rec.driveTimeMinutes} min drive
                          </Badge>
                          {rec.matchReasons.map((r, j) => <Badge key={j} variant="success" className="text-[10px]">{r}</Badge>)}
                          {rec.warnings.map((w, j) => <Badge key={j} variant="warning" className="text-[10px]">{w}</Badge>)}
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
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <p className="text-sm font-medium text-emerald-300">Ready to schedule!</p>
                  </div>
                  <div className="rounded-xl bg-[#0d1321] border border-[#1e2a3a] p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer</span>
                      <span className="font-medium text-slate-200">{customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service</span>
                      <span className="font-medium text-slate-200 capitalize">{formData.serviceType} clean</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date & Time</span>
                      <span className="font-medium text-slate-200">{formData.date} at {formData.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Team</span>
                      <span className="font-medium text-slate-200">{selectedTeam.map(id => CLEANERS.find(c=>c.id===id)?.name.split(' ')[0]).join(' + ')}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#1e2a3a] pt-3 font-semibold">
                      <span className="text-slate-300">Total Price</span>
                      <span className="text-emerald-400">{formatCurrency(price)}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1e2a3a] p-5">
          <Button variant="outline" onClick={bookingStep === 0 ? closeBooking : prevStep}>
            {bookingStep === 0 ? <><X className="h-4 w-4" /> Cancel</> : <><ChevronLeft className="h-4 w-4" /> Back</>}
          </Button>
          {bookingStep === 1 ? (
            <Button onClick={handleComputeRecommendations}>
              <Sparkles className="h-4 w-4" /> Get AI Recommendations
            </Button>
          ) : bookingStep === 3 ? (
            <Button onClick={handleConfirm} disabled={!selectedTeam}>
              <CheckCircle className="h-4 w-4" /> Schedule Job
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
