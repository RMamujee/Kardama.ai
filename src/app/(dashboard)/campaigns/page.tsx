'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Send, Link2, Calendar, Clock, CheckCircle2, RefreshCw,
  Sparkles, Copy, Users, ChevronDown, ChevronRight, MapPin, Star, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCampaignStore } from '@/store/useCampaignStore'
import { CUSTOMERS, CLEANERS, JOBS } from '@/lib/mock-data'
import { formatDate, formatTime, cn } from '@/lib/utils'
import { NurturingCampaign, BookingSlot } from '@/types'

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6','#14b8a6','#f43f5e','#a855f7','#06b6d4','#22c55e','#ef4444']

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'neutral' | 'danger' | 'purple'; icon: React.ReactNode }> = {
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

function CampaignRow({ campaign }: { campaign: NurturingCampaign }) {
  const { markSent, sending, generateLink, bookingLinks } = useCampaignStore()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const customer = CUSTOMERS.find(c => c.id === campaign.customerId)
  if (!customer) return null

  const avatarColor = AVATAR_COLORS[CUSTOMERS.indexOf(customer) % AVATAR_COLORS.length]
  const initials = customer.name.split(' ').map(n => n[0]).join('')
  const status = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.pending
  const isSending = sending === campaign.id

  const existingLink = bookingLinks.find(l => l.customerId === campaign.customerId && campaign.bookingLinkToken)
  const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${campaign.bookingLinkToken}`

  function handleCopy() {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('border-b border-[#1e2a3a] last:border-0 transition-colors', campaign.status === 'pending' && 'bg-amber-500/[0.02]')}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Avatar initials={initials} color={avatarColor} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-200 truncate">{customer.name}</p>
            <span className="hidden sm:inline text-xs text-slate-600">{customer.city}</span>
          </div>
          <p className="text-xs text-slate-500">
            Last cleaned {campaign.daysSinceLastJob}d ago · {TRIGGER_LABELS[campaign.trigger]}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={status.variant} className="text-[10px] flex items-center gap-1">
            {status.icon} {status.label}
          </Badge>
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-600" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
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
              <div className="rounded-xl bg-[#070b14] border border-[#1e2a3a] p-4">
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Follow-up Message</p>
                <p className="text-sm text-slate-300 leading-relaxed">{campaign.message}</p>
              </div>

              {/* Booking link */}
              {campaign.bookingLinkToken && (
                <div className="flex items-center gap-2 rounded-lg bg-[#0d1321] border border-[#1e2a3a] p-3">
                  <Link2 className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="flex-1 text-xs text-slate-400 font-mono truncate">{bookingUrl}</span>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex-shrink-0 font-medium"
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
                  <Button size="sm" variant="outline" onClick={handleCopy} className="flex-1">
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </Button>
                </div>
              )}

              {campaign.status === 'sent' && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
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

function SlotCard({ slot, onSelect, selected }: { slot: BookingSlot; onSelect: () => void; selected: boolean }) {
  const cleaners = CLEANERS.filter(c => slot.cleanerIds.includes(c.id))
  const efficiency = slot.routeScore >= 70 ? 'Route-efficient' : slot.routeScore >= 40 ? 'Good fit' : 'Available'
  const efficiencyColor = slot.routeScore >= 70 ? 'text-emerald-400' : slot.routeScore >= 40 ? 'text-indigo-400' : 'text-slate-400'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border p-3.5 text-left transition-all',
        selected
          ? 'border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
          : 'border-[#1e2a3a] bg-[#0d1321] hover:border-[#2e3d52] hover:bg-[#111827]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{slot.label}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn('text-xs font-medium', efficiencyColor)}>{efficiency}</span>
            <span className="text-xs text-slate-600">{slot.driveTimeMinutes} min drive</span>
          </div>
        </div>
        <div className="flex -space-x-1.5 flex-shrink-0">
          {cleaners.map(c => (
            <Avatar key={c.id} initials={c.initials} color={c.color} size="sm" className="ring-2 ring-[#0d1321]" />
          ))}
        </div>
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1 text-xs text-indigo-400">
          <CheckCircle2 className="h-3 w-3" /> Selected — copy link to share
        </div>
      )}
    </button>
  )
}

export default function CampaignsPage() {
  const { campaigns, selectCustomer, selectedCustomerId, availableSlots, loadingSlots, generateLink, bookingLinks } = useCampaignStore()
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [bookingCustomerId, setBookingCustomerId] = useState<string>(CUSTOMERS[0].id)

  const pendingCount = campaigns.filter(c => c.status === 'pending').length
  const sentCount = campaigns.filter(c => c.status === 'sent').length
  const totalReach = campaigns.length

  const activeLink = bookingLinks.find(l => l.customerId === bookingCustomerId)

  function handleGenerateLink() {
    selectCustomer(bookingCustomerId)
    generateLink(bookingCustomerId)
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}/book/${token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const selectedCustomer = CUSTOMERS.find(c => c.id === bookingCustomerId)

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Ready to Send', value: pendingCount, icon: Bell, color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.10)]' },
          { label: 'Sent This Cycle', value: sentCount, icon: Send, color: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.10)]' },
          { label: 'Total Campaigns', value: totalReach, icon: Users, color: 'text-violet-400', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.10)]' },
          { label: 'Links Generated', value: bookingLinks.length, icon: Link2, color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.10)]' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className={`kpi-card rounded-xl p-4 ${s.glow}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">{s.value}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a2537]">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="nurturing">
        <TabsList className="mb-4">
          <TabsTrigger value="nurturing">
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Nurturing Campaigns
            {pendingCount > 0 && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
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
          <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 flex-shrink-0">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">3-Week Follow-up Automation</p>
              <p className="text-xs text-slate-500 mt-0.5">
                AI detects customers whose last cleaning was 21+ days ago and generates personalized follow-up messages with booking links. Each link shows route-optimized time slots.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Follow-up Queue</CardTitle>
                <Badge variant="warning" className="text-xs">{pendingCount} pending</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {campaigns.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No customers need follow-up yet.
                </div>
              ) : (
                campaigns.map(c => <CampaignRow key={c.id} campaign={c} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Links Tab */}
        <TabsContent value="booking-links" className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 flex-shrink-0">
              <Link2 className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Route-Smart Booking Links</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate a personalized booking link for any customer. Available time slots are calculated based on team schedules and cleaning routes — prioritizing slots that cluster nearby jobs to reduce drive time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* Customer selector + link gen */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Booking Link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-2 block">Select Customer</label>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {CUSTOMERS.map((c, i) => {
                        const initials = c.name.split(' ').map(n => n[0]).join('')
                        const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
                        return (
                          <button
                            key={c.id}
                            onClick={() => setBookingCustomerId(c.id)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                              bookingCustomerId === c.id
                                ? 'bg-indigo-500/15 border border-indigo-500/30'
                                : 'hover:bg-white/[0.03] border border-transparent'
                            )}
                          >
                            <Avatar initials={initials} color={color} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-200 truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-500">{c.city}</p>
                            </div>
                            {bookingCustomerId === c.id && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />}
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
                      <div className="flex items-center gap-2 rounded-lg bg-[#070b14] border border-emerald-500/30 p-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-emerald-400">Link Generated!</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
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
                      <p className="text-[10px] text-slate-600 text-center">
                        Expires {new Date(activeLink.expiresAt + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Available Slots */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Available Slots
                    {selectedCustomer && (
                      <span className="text-slate-500 font-normal text-sm ml-1">— {selectedCustomer.name}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSlots ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-[#0d1321] animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                      Select a customer and click &ldquo;Generate Booking Link&rdquo; to see available slots based on team schedules and cleaning routes.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableSlots.map((slot, i) => (
                        <SlotCard
                          key={`${slot.date}-${slot.time}-${i}`}
                          slot={slot}
                          selected={selectedSlot?.date === slot.date && selectedSlot?.time === slot.time}
                          onSelect={() => setSelectedSlot(slot)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Previously generated links */}
          {bookingLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Links</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bookingLinks.map(link => {
                  const customer = CUSTOMERS.find(c => c.id === link.customerId)
                  if (!customer) return null
                  const initials = customer.name.split(' ').map(n => n[0]).join('')
                  const color = AVATAR_COLORS[CUSTOMERS.indexOf(customer) % AVATAR_COLORS.length]
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${link.token}`
                  return (
                    <div key={link.token} className="flex items-center gap-3 px-4 py-3 border-b border-[#1e2a3a] last:border-0">
                      <Avatar initials={initials} color={color} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{customer.name}</p>
                        <p className="text-xs text-slate-500 font-mono truncate">/book/{link.token.slice(0, 20)}…</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="neutral" className="text-[10px]">{link.slots.length} slots</Badge>
                        <button
                          onClick={() => { navigator.clipboard.writeText(url) }}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
