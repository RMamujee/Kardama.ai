'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles, MapPin, Clock, CheckCircle, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { useSchedulingStore } from '@/store/useSchedulingStore'
import { createJob } from '@/app/actions/scheduling'
import { addCustomer, geocodeAddressForBooking } from '@/app/actions/customers'
import { formatCurrency, cn } from '@/lib/utils'
import { SERVICE_PRICES, SERVICE_DURATIONS } from '@/lib/services'
import type { Cleaner, Customer, Job, SchedulingRequest } from '@/types'

const STEPS = ['Customer', 'Service Details', 'AI Assignment', 'Confirm']

const SOURCE_OPTIONS: Array<{ value: 'facebook' | 'yelp' | 'referral' | 'text' | 'repeat'; label: string }> = [
  { value: 'referral', label: 'Referral' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'text', label: 'Text / call-in' },
  { value: 'repeat', label: 'Repeat' },
]

interface Props {
  cleaners: Cleaner[]
  customers: Customer[]
  jobs: Job[]
}

type CustomerMode = 'existing' | 'new'

interface NewCustomerForm {
  name: string
  phone: string
  email: string
  address: string
  city: string
  source: 'facebook' | 'yelp' | 'referral' | 'text' | 'repeat'
  notes: string
}

export function BookingWizard({ cleaners, customers, jobs }: Props) {
  const router = useRouter()
  const {
    bookingStep, nextStep, prevStep, closeBooking,
    computeRecommendations, recommendations, selectedTeam, selectTeam,
  } = useSchedulingStore()
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  const [customerMode, setCustomerMode] = useState<CustomerMode>(
    customers.length === 0 ? 'new' : 'existing',
  )
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
    name: '', phone: '', email: '', address: '', city: '',
    source: 'referral', notes: '',
  })
  const [pendingGeo, setPendingGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const [formData, setFormData] = useState({
    customerId: customers[0]?.id ?? '',
    serviceType: 'standard',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    notes: '',
  })

  const existingCustomer = customers.find(c => c.id === formData.customerId)
  const price = SERVICE_PRICES[formData.serviceType] ?? 165

  const newCustomerValid =
    newCustomer.name.trim().length >= 2 &&
    newCustomer.phone.trim().length >= 7 &&
    /\S+@\S+\.\S+/.test(newCustomer.email.trim()) &&
    newCustomer.address.trim().length >= 5 &&
    newCustomer.city.trim().length >= 2

  const canAdvanceFromStep0 = customerMode === 'existing' ? !!existingCustomer : newCustomerValid

  function updateNew<K extends keyof NewCustomerForm>(key: K, value: NewCustomerForm[K]) {
    setNewCustomer(prev => ({ ...prev, [key]: value }))
  }

  // For step 2 (AI) and step 3 (Confirm) display only — represents the
  // customer this booking is for, regardless of mode.
  const displayName = customerMode === 'existing' ? existingCustomer?.name ?? '' : newCustomer.name
  const displayAddress = customerMode === 'existing' ? existingCustomer?.address ?? '' : `${newCustomer.address}, ${newCustomer.city}`

  async function handleComputeRecommendations() {
    setSaveError(null)
    let lat = 0
    let lng = 0
    let customerIdForRec = ''
    let preferredIds: string[] = []

    if (customerMode === 'existing') {
      if (!existingCustomer) return
      lat = existingCustomer.lat
      lng = existingCustomer.lng
      customerIdForRec = existingCustomer.id
      preferredIds = existingCustomer.preferredCleanerIds
    } else {
      setIsGeocoding(true)
      try {
        const geo = await geocodeAddressForBooking(newCustomer.address, newCustomer.city)
        if (geo) {
          lat = geo.lat
          lng = geo.lng
          setPendingGeo(geo)
        } else {
          setPendingGeo(null)
        }
      } catch (e) {
        console.error('[BookingWizard] geocode failed:', e)
        setPendingGeo(null)
      } finally {
        setIsGeocoding(false)
      }
    }

    const req: SchedulingRequest = {
      jobDate: formData.date,
      jobTime: formData.time,
      jobDuration: SERVICE_DURATIONS[formData.serviceType] ?? 180,
      jobLat: lat,
      jobLng: lng,
      serviceType: formData.serviceType,
      customerId: customerIdForRec,
      preferredCleanerIds: preferredIds,
    }
    computeRecommendations(req, cleaners, jobs, customers)
    nextStep()
  }

  function handleConfirm() {
    if (!selectedTeam) return
    setSaveError(null)
    startTransition(async () => {
      try {
        let resolvedCustomerId: string
        let address: string
        let lat: number
        let lng: number

        if (customerMode === 'existing') {
          if (!existingCustomer) {
            throw new Error('Pick a customer to continue')
          }
          resolvedCustomerId = existingCustomer.id
          address = existingCustomer.address
          lat = existingCustomer.lat
          lng = existingCustomer.lng
        } else {
          const result = await addCustomer({
            name: newCustomer.name,
            phone: newCustomer.phone,
            email: newCustomer.email,
            address: newCustomer.address,
            city: newCustomer.city,
            source: newCustomer.source,
            notes: newCustomer.notes,
          })
          if (!result.ok) {
            // Surface the first field error if present, otherwise the generic one
            const fieldMsg = result.fieldErrors
              ? Object.entries(result.fieldErrors).map(([k, v]) => `${k}: ${v}`).join(' · ')
              : null
            throw new Error(fieldMsg || result.error)
          }
          resolvedCustomerId = result.data.id
          address = newCustomer.address
          lat = pendingGeo?.lat ?? 0
          lng = pendingGeo?.lng ?? 0
        }

        await createJob({
          customerId: resolvedCustomerId,
          cleanerIds: selectedTeam,
          scheduledDate: formData.date,
          scheduledTime: formData.time,
          estimatedDuration: SERVICE_DURATIONS[formData.serviceType] ?? 180,
          serviceType: formData.serviceType as Parameters<typeof createJob>[0]['serviceType'],
          price,
          address,
          lat,
          lng,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/25 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-3xl rounded-2xl bg-card border border-line-strong shadow-[0_20px_60px_-8px_rgba(0,0,0,0.14),0_8px_24px_-4px_rgba(0,0,0,0.08)] overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-200 px-9 py-6 flex-shrink-0">
          <div>
            <h2 className="text-[19px] font-semibold text-ink-900 tracking-[-0.01em]">New Job</h2>
            <p className="text-[13px] text-ink-500 mt-0.5">Step {bookingStep + 1} of 4: {STEPS[bookingStep]}</p>
          </div>
          <button onClick={closeBooking} className="rounded-lg p-2 -mr-2 hover:bg-hover transition-colors">
            <X className="h-5 w-5 text-ink-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-ink-100 flex-shrink-0">
          <div
            className="h-1 bg-violet-500 transition-all duration-300"
            style={{ width: `${(bookingStep + 1) * 25}%` }}
          />
        </div>

        {/* Steps */}
        <div className="px-9 py-7 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={bookingStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Step 0: Customer */}
              {bookingStep === 0 && (
                <div className="space-y-5">
                  {/* Mode toggle */}
                  <div className="inline-flex rounded-lg border border-ink-200 p-1 bg-soft">
                    <button
                      type="button"
                      onClick={() => setCustomerMode('existing')}
                      disabled={customers.length === 0}
                      className={cn(
                        'flex items-center gap-2 px-4 py-1.5 rounded-md text-[12.5px] font-medium transition-colors',
                        customerMode === 'existing'
                          ? 'bg-card text-ink-900 shadow-sm'
                          : 'text-ink-500 hover:text-ink-700',
                        customers.length === 0 && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Existing customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMode('new')}
                      className={cn(
                        'flex items-center gap-2 px-4 py-1.5 rounded-md text-[12.5px] font-medium transition-colors',
                        customerMode === 'new'
                          ? 'bg-card text-ink-900 shadow-sm'
                          : 'text-ink-500 hover:text-ink-700',
                      )}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      New customer
                    </button>
                  </div>

                  {customerMode === 'existing' ? (
                    <>
                      <div>
                        <Label className="text-ink-700">Select Customer</Label>
                        <Select value={formData.customerId} onChange={e => setFormData(d => ({ ...d, customerId: e.target.value }))} className="mt-2">
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                          ))}
                        </Select>
                      </div>
                      {existingCustomer && (
                        <div className="rounded-xl bg-soft border border-ink-200 p-5 space-y-2.5">
                          <div className="flex items-start gap-2.5 text-[13px]">
                            <MapPin className="h-4 w-4 text-ink-400 flex-shrink-0 mt-0.5" />
                            <span className="text-ink-500 leading-[1.5]">{existingCustomer.address}</span>
                          </div>
                          <p className="text-[12px] text-ink-400 pl-[26px]">
                            Source: {existingCustomer.source} · {existingCustomer.jobHistory.length} prior jobs · ${existingCustomer.totalSpent} spent
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                      <div>
                        <Label className="text-ink-700">Full name</Label>
                        <Input
                          value={newCustomer.name}
                          onChange={e => updateNew('name', e.target.value)}
                          placeholder="Jane Doe"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-ink-700">Phone</Label>
                        <Input
                          type="tel"
                          value={newCustomer.phone}
                          onChange={e => updateNew('phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          className="mt-2"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-ink-700">Email</Label>
                        <Input
                          type="email"
                          value={newCustomer.email}
                          onChange={e => updateNew('email', e.target.value)}
                          placeholder="jane@example.com"
                          className="mt-2"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-ink-700">Address</Label>
                        <Input
                          value={newCustomer.address}
                          onChange={e => updateNew('address', e.target.value)}
                          placeholder="123 Main St"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-ink-700">City</Label>
                        <Input
                          value={newCustomer.city}
                          onChange={e => updateNew('city', e.target.value)}
                          placeholder="Austin"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-ink-700">How did they hear about us?</Label>
                        <Select
                          value={newCustomer.source}
                          onChange={e => updateNew('source', e.target.value as NewCustomerForm['source'])}
                          className="mt-2"
                        >
                          {SOURCE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-ink-700">Customer notes (optional)</Label>
                        <textarea
                          value={newCustomer.notes}
                          onChange={e => updateNew('notes', e.target.value)}
                          rows={2}
                          placeholder="Pets, gate codes, preferences…"
                          className="mt-2 w-full rounded-lg border border-ink-100 bg-soft px-3 py-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 resize-none focus:outline-none focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Service Details */}
              {bookingStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <div>
                      <Label className="text-ink-700">Service Type</Label>
                      <Select value={formData.serviceType} onChange={e => setFormData(d => ({ ...d, serviceType: e.target.value }))} className="mt-2">
                        <option value="standard">Standard Clean — $165</option>
                        <option value="deep">Deep Clean — $245</option>
                        <option value="move-out">Move-Out — $380</option>
                        <option value="post-construction">Post-Construction — $450</option>
                        <option value="airbnb">Airbnb Turnover — $195</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-ink-700">Date</Label>
                      <Input type="date" value={formData.date} onChange={e => setFormData(d => ({ ...d, date: e.target.value }))} className="mt-2" />
                    </div>
                    <div>
                      <Label className="text-ink-700">Start Time</Label>
                      <Select value={formData.time} onChange={e => setFormData(d => ({ ...d, time: e.target.value }))} className="mt-2">
                        {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label className="text-ink-700">Price</Label>
                      <div className="mt-2 flex h-9 items-center rounded-lg border border-ink-200 bg-soft px-3 text-[13px] font-semibold text-emerald-500">
                        {formatCurrency(price)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-ink-700">Notes (optional)</Label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-ink-100 bg-soft px-3 py-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 resize-none focus:outline-none focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/20"
                      rows={3}
                      placeholder="Special instructions..."
                    />
                  </div>
                </div>
              )}

              {/* Step 2: AI Assignment */}
              {bookingStep === 2 && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3">
                    <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0" />
                    <p className="text-[13px] text-violet-400 font-medium">
                      {customerMode === 'new' && !pendingGeo
                        ? 'Could not geocode the address — recommendations may not factor in proximity.'
                        : 'AI analyzed all teams — here are the best matches:'}
                    </p>
                  </div>
                  {recommendations.map((rec, i) => {
                    const teamCleaners = rec.cleanerIds.map(id => cleaners.find(c => c.id === id)).filter(Boolean) as Cleaner[]
                    const isSelected = selectedTeam?.[0] === rec.cleanerIds[0]
                    return (
                      <button
                        key={i}
                        onClick={() => selectTeam(rec.cleanerIds)}
                        className={cn(
                          'w-full rounded-xl border-2 p-5 text-left transition-all',
                          isSelected
                            ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,133,242,0.4)]'
                            : 'border-ink-200 hover:border-ink-300 hover:bg-hover'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex -space-x-1 flex-shrink-0">
                              {teamCleaners.map(c => <Avatar key={c.id} initials={c.initials} color={c.color} size="sm" />)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink-900 text-[13px] truncate">{teamCleaners.map(c => c.name).join(' + ')}</p>
                              <p className="text-[12px] text-ink-500 mt-0.5">{teamCleaners[0]?.homeAreaName} team</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={cn('text-[24px] font-bold leading-none', rec.score >= 80 ? 'text-emerald-500' : rec.score >= 60 ? 'text-amber-500' : 'text-rose-500')}>{rec.score}</div>
                            <div className="text-[11px] text-ink-500 mt-1">AI score</div>
                          </div>
                        </div>
                        <div className="mt-3.5 flex flex-wrap gap-1.5">
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
              {bookingStep === 3 && selectedTeam && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3.5">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-[13px] font-medium text-emerald-500">
                      Ready to schedule{customerMode === 'new' ? ' — a new customer record will be created' : ''}!
                    </p>
                  </div>
                  <div className="rounded-xl bg-soft border border-ink-200 p-5 space-y-3.5 text-[13px]">
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-500">Customer</span>
                      <span className="font-medium text-ink-900 text-right">{displayName}</span>
                    </div>
                    {customerMode === 'new' && (
                      <>
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-500">Phone</span>
                          <span className="font-medium text-ink-900 text-right">{newCustomer.phone}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-500">Email</span>
                          <span className="font-medium text-ink-900 text-right">{newCustomer.email}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-500">Address</span>
                      <span className="font-medium text-ink-900 text-right">{displayAddress}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-500">Service</span>
                      <span className="font-medium text-ink-900 capitalize text-right">{formData.serviceType} clean</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-500">Date & Time</span>
                      <span className="font-medium text-ink-900 text-right">{formData.date} at {formData.time}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-500">Team</span>
                      <span className="font-medium text-ink-900 text-right">
                        {selectedTeam.map(id => cleaners.find(c => c.id === id)?.name.split(' ')[0] ?? id).join(' + ')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-ink-200 pt-3.5 font-semibold">
                      <span className="text-ink-700">Total Price</span>
                      <span className="text-emerald-500">{formatCurrency(price)}</span>
                    </div>
                  </div>
                  {saveError && (
                    <p className="rounded-lg bg-rose-500/10 border border-rose-500/25 px-3.5 py-2.5 text-[12.5px] text-rose-500">{saveError}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-200 px-9 py-6 flex-shrink-0">
          <Button size="lg" variant="outline" onClick={bookingStep === 0 ? closeBooking : prevStep} disabled={isPending || isGeocoding} className="min-w-[120px]">
            {bookingStep === 0 ? <><X className="h-4 w-4" /> Cancel</> : <><ChevronLeft className="h-4 w-4" /> Back</>}
          </Button>
          {bookingStep === 1 ? (
            <Button size="lg" onClick={handleComputeRecommendations} disabled={isGeocoding} className="min-w-[220px]">
              <Sparkles className="h-4 w-4" />
              {isGeocoding ? 'Locating address…' : 'Get AI Recommendations'}
            </Button>
          ) : bookingStep === 3 ? (
            <Button size="lg" onClick={handleConfirm} disabled={!selectedTeam || isPending} className="min-w-[180px]">
              <CheckCircle className="h-4 w-4" /> {isPending ? 'Saving…' : 'Schedule Job'}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={nextStep}
              disabled={
                (bookingStep === 0 && !canAdvanceFromStep0) ||
                (bookingStep === 2 && !selectedTeam)
              }
              className="min-w-[150px]"
            >
              {bookingStep === 0 && !canAdvanceFromStep0
                ? customerMode === 'existing' ? 'Pick a Customer' : 'Fill Required Fields'
                : bookingStep === 2 && !selectedTeam
                  ? 'Select a Team'
                  : <>Next <ChevronRight className="h-4 w-4" /></>
              }
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
