'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Send, Link2, Clock, CheckCircle2, RefreshCw,
  Sparkles, Copy, Users, ChevronDown, ChevronRight, AlertCircle, Zap, Route
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatTile } from '@/components/ui/stat-tile'
import { useCampaignStore } from '@/store/useCampaignStore'
import { cn } from '@/lib/utils'
import type { Cleaner, Customer, Job, NurturingCampaign, BookingSlot } from '@/types'

type CampaignsData = {
  customers: Customer[]
  cleaners: Cleaner[]
  jobs: Job[]
}

const AVATAR_COLORS = ['#5EEAD4','#34D399','#F472B6','#60A5FA','#FBBF24','#A78BFA','#2DD4BF','#F87171','#22D3EE','#06b6d4','#34D399','#F87171']

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'neutral' | 'danger'; icon: React.ReactNode }> = {
  pending: { label: 'Ready to Send', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
  sent: { label: 'Sent', variant: 'default', icon: <Send className="h-3 w-3" /> },
  clicked: { label: 'Link Clicked', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  booked: { label: 'Booked!', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  expired: { label: 'Expired', variant: 'neutral', icon: <AlertCircle className="h-3 w-3" /> },
}

const TRIGGER_LABELS: Record<string, string> = {
  'three-week-followup': '3-Week Follow-up',
  'inactive-30d': 'Inactive 30+ Days',
  'manual': 'Manual Campaign',
}

function CampaignRow({ campaign, customers }: { campaign: NurturingCampaign; customers: Customer[] }) {
  const { markSent, sending, bookingLinks } = useCampaignStore()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const customer = customers.find(c => c.id === campaign.customerId)
  if (!customer) return null

  const avatarColor = AVATAR_COLORS[customers.indexOf(customer) % AVATAR_COLORS.length]
  const initials = customer.name.split(' ').map(n => n[0]).join('')
  const status = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.pending
  const isSending = sending === campaign.id

  const generatedLink = bookingLinks.find(l => l.customerId === campaign.customerId)
  const bookingUrl = generatedLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${generatedLink.token}`
    : null

  function handleCopy() {
    if (!bookingUrl) return
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('border-b border-line last:border-0 transition-colors', campaign.status === 'pending' && 'bg-amber-500/[0.02]')}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-soft transition-colors"
      >
        <Avatar initials={initials} color={avatarColor} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13.5px] font-semibold text-ink-900 truncate">{customer.name}</p>
            <span className="hidden sm:inline text-ink-400 text-[12px]">{customer.city}</span>
          </div>
          <p className="text-ink-500 mt-0.5 text-[12px]">
            Last cleaned <span className="num">{campaign.daysSinceLastJob}d</span> ago · {TRIGGER_LABELS[campaign.trigger]}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={status.variant} className="flex items-center gap-1">
            {status.icon} {status.label}
          </Badge>
          {expanded ? <ChevronDown className="h-4 w-4 text-ink-400" /> : <ChevronRight className="h-4 w-4 text-ink-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-16 space-y-3">
              {/* Message preview */}
              <div className="rounded-[10px] bg-page border border-line p-4">
                <p className="mb-2 text-[12px] font-medium text-ink-500">Follow-up Message</p>
                <p className="text-[13.5px] text-ink-700 leading-relaxed">{campaign.message}</p>
              </div>

              {/* Booking link */}
              {bookingUrl && (
                <div className="flex items-center gap-2 rounded-[10px] bg-soft border border-line p-3.5">
                  <Link2 className="h-4 w-4 text-mint-500 flex-shrink-0" />
                  <span className="flex-1 text-ink-500 truncate text-[12.5px]">{bookingUrl}</span>
                  <button
                    onClick={handleCopy}
                    className="text-mint-500 hover:text-mint-400 flex-shrink-0 font-medium text-[12.5px]"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Actions */}
              {campaign.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => markSent(campaign.id)}
                    disabled={isSending}
                    className="flex-1"
                  >
                    {isSending ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="h-3.5 w-3.5" /> Send via SMS</>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCopy} disabled={!bookingUrl} className="flex-1">
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </Button>
                </div>
              )}

              {campaign.status === 'sent' && (
                <p className="text-ink-500 flex items-center gap-1.5 text-[12px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Sent {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : 'today'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SlotCard({
  slot, onSelect, selected, cleaners,
}: {
  slot: BookingSlot; onSelect: () => void; selected: boolean; cleaners: Cleaner[]
}) {
  const slotCleaners = cleaners.filter(c => slot.cleanerIds.includes(c.id))
  const isOnRoute = slot.routeScore >= 70
  const isGood    = slot.routeScore >= 40

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full rounded-[10px] border p-4 text-left transition-colors',
        selected
          ? 'border-mint-500/60 bg-mint-500/8'
          : 'border-line bg-soft hover:border-line-strong hover:bg-hover',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-ink-900 truncate">{slot.label}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {slot.insertionLabel ? (
              <div className="flex items-center gap-1">
                {isOnRoute
                  ? <Zap className="h-3.5 w-3.5 text-emerald-500" />
                  : isGood
                  ? <Route className="h-3.5 w-3.5 text-mint-500" />
                  : null}
                <span className={cn('font-medium text-[12px]',
                  isOnRoute ? 'text-emerald-500' : isGood ? 'text-mint-500' : 'text-ink-500',
                )}>
                  {slot.insertionLabel}
                </span>
              </div>
            ) : (
              <span className="text-ink-500 text-[12px]">Available</span>
            )}
            <span className="text-ink-400 text-[12px]">·</span>
            <span className="text-ink-400 text-[12px]">{slotCleaners.map(c => c.name.split(' ')[0]).join(' & ')}</span>
          </div>
        </div>
        <div className="flex -space-x-1.5 flex-shrink-0">
          {slotCleaners.map(c => (
            <Avatar key={c.id} initials={c.initials} color={c.color} size="sm" className="ring-2 ring-soft" />
          ))}
        </div>
      </div>
      {selected && (
        <div className="mt-2.5 flex items-center gap-1.5 text-mint-500 text-[12px]">
          <CheckCircle2 className="h-3.5 w-3.5" /> Selected — copy link to share
        </div>
      )}
    </button>
  )
}

export function CampaignsClient({ customers, cleaners }: CampaignsData) {
  const { campaigns, selectCustomer, availableSlots, loadingSlots, generateLink, bookingLinks } = useCampaignStore()
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [bookingCustomerId, setBookingCustomerId] = useState<string>(customers[0]?.id ?? '')

  const pendingCount = campaigns.filter(c => c.status === 'pending').length
  const sentCount = campaigns.filter(c => c.status === 'sent').length
  const totalReach = campaigns.length

  const activeLink = bookingLinks.find(l => l.customerId === bookingCustomerId)

  async function handleGenerateLink() {
    selectCustomer(bookingCustomerId)
    await generateLink(bookingCustomerId)
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}/book/${token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const selectedCustomer = customers.find(c => c.id === bookingCustomerId)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          { label: 'Ready to Send',   value: pendingCount,        icon: Bell,  tone: 'amber'   as const },
          { label: 'Sent This Cycle', value: sentCount,           icon: Send,  tone: 'mint'    as const },
          { label: 'Total Campaigns', value: totalReach,          icon: Users, tone: 'mint'    as const },
          { label: 'Links Generated', value: bookingLinks.length, icon: Link2, tone: 'emerald' as const },
        ]).map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatTile label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="nurturing">
        <TabsList className="mb-4">
          <TabsTrigger value="nurturing">
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Nurturing Campaigns
            {pendingCount > 0 && (
              <span className="ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500/20 px-1 font-semibold text-amber-500 text-[10.5px]">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="booking-links">
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Booking Links
          </TabsTrigger>
        </TabsList>

        {/* Nurturing Campaigns Tab */}
        <TabsContent value="nurturing" className="space-y-4">
          {/* Info banner */}
          <div className="card flex items-start gap-3 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-amber-500/12 flex-shrink-0">
              <Sparkles className="h-[16px] w-[16px] text-amber-500" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-ink-900">3-Week Follow-up Automation</p>
              <p className="text-ink-500 mt-1 leading-relaxed text-[12.5px]">
                AI detects customers whose last cleaning was 21+ days ago and generates personalized follow-up messages with booking links. Each link shows route-optimized time slots.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">Follow-up Queue</h2>
              <Badge variant="warning"><span className="num">{pendingCount}</span>&nbsp;pending</Badge>
            </div>
            {campaigns.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-ink-500">
                No customers need follow-up yet.
              </div>
            ) : (
              campaigns.map(c => <CampaignRow key={c.id} campaign={c} customers={customers} />)
            )}
          </div>
        </TabsContent>

        {/* Booking Links Tab */}
        <TabsContent value="booking-links" className="space-y-4">
          <div className="card flex items-start gap-3 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-mint-500/12 flex-shrink-0">
              <Link2 className="h-[16px] w-[16px] text-mint-500" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-ink-900">Route-Smart Booking Links</p>
              <p className="text-ink-500 mt-1 leading-relaxed text-[12.5px]">
                Generate a personalized booking link for any customer. Available time slots are calculated based on team schedules and cleaning routes — prioritizing slots that cluster nearby jobs to reduce drive time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* Customer selector + link gen */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">Generate Booking Link</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="mb-2.5 block text-[12px] font-medium text-ink-500">Select Customer</label>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {customers.map((c, i) => {
                        const initials = c.name.split(' ').map(n => n[0]).join('')
                        const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
                        return (
                          <button
                            key={c.id}
                            onClick={() => setBookingCustomerId(c.id)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left transition-colors',
                              bookingCustomerId === c.id
                                ? 'bg-mint-500/8 border border-mint-500/30'
                                : 'hover:bg-soft border border-transparent',
                            )}
                          >
                            <Avatar initials={initials} color={color} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-ink-900 truncate text-[13px]">{c.name}</p>
                              <p className="text-ink-500 text-[11px]">{c.city}</p>
                            </div>
                            {bookingCustomerId === c.id && <CheckCircle2 className="h-3.5 w-3.5 text-mint-500 flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Button className="w-full" onClick={handleGenerateLink} disabled={loadingSlots}>
                    {loadingSlots ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Computing route slots…</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5" /> Generate Booking Link</>
                    )}
                  </Button>

                  {activeLink && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-[10px] bg-page border border-emerald-500/30 p-3.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-emerald-500 text-[13px]">Link Generated!</p>
                          <p className="text-ink-500 truncate text-[11px]">
                            /book/{activeLink.token.slice(0, 18)}…
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleCopyLink(activeLink.token)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedLink ? '✓ Copied!' : 'Copy Link to Share'}
                      </Button>
                      <p className="text-ink-400 text-center text-[11px]">
                        Expires {new Date(activeLink.expiresAt + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Available Slots */}
            <div className="lg:col-span-3">
              <div className="card">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">
                    Available Slots
                    {selectedCustomer && (
                      <span className="text-ink-500 font-normal text-[13px] ml-1">— {selectedCustomer.name}</span>
                    )}
                  </h2>
                </div>
                <div className="p-5">
                  {loadingSlots ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-[10px] bg-soft animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="py-12 text-center text-[13px] text-ink-500">
                      Select a customer and click &ldquo;Generate Booking Link&rdquo; to see available slots based on team schedules and cleaning routes.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {availableSlots.map((slot, i) => (
                        <SlotCard
                          key={`${slot.date}-${slot.time}-${i}`}
                          slot={slot}
                          cleaners={cleaners}
                          selected={selectedSlot?.date === slot.date && selectedSlot?.time === slot.time}
                          onSelect={() => setSelectedSlot(slot)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Previously generated links */}
          {bookingLinks.length > 0 && (
            <div className="card">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-[14.5px] font-semibold text-ink-900 tracking-[-0.01em]">Generated Links</h2>
              </div>
              {bookingLinks.map(link => {
                const customer = customers.find(c => c.id === link.customerId)
                if (!customer) return null
                const initials = customer.name.split(' ').map(n => n[0]).join('')
                const color = AVATAR_COLORS[customers.indexOf(customer) % AVATAR_COLORS.length]
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${link.token}`
                return (
                  <div key={link.token} className="flex items-center gap-3 px-4 py-3.5 border-b border-line last:border-0">
                    <Avatar initials={initials} color={color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-ink-900">{customer.name}</p>
                      <p className="text-ink-500 truncate text-[12px]">/book/{link.token.slice(0, 20)}…</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="neutral"><span className="num">{link.slots.length}</span>&nbsp;slots</Badge>
                      <button
                        onClick={() => { navigator.clipboard.writeText(url) }}
                        className="text-mint-500 hover:text-mint-400"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
