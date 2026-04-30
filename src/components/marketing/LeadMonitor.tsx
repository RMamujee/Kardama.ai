'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, ThumbsUp, Clock, MapPin, CheckCircle2,
  XCircle, UserPlus, RotateCcw, Send, ChevronDown, Filter,
  Globe2, Camera, AlertTriangle, Eye, RefreshCw, Plus,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatTile } from '@/components/ui/stat-tile'
import { useSocialStore } from '@/store/useSocialStore'
import { SocialLead, LeadPlatform, LeadStatus } from '@/types'
import { cn } from '@/lib/utils'

const PLATFORM_CONFIG: Record<LeadPlatform, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  'facebook-group': { label: 'FB Group',   color: 'text-violet-400',  bg: 'bg-violet-500/15',  Icon: Globe2 },
  'facebook-page':  { label: 'FB Page',    color: 'text-violet-400',  bg: 'bg-violet-500/15',  Icon: Globe2 },
  'instagram':      { label: 'Instagram',  color: 'text-pink-500',    bg: 'bg-pink-500/15',    Icon: Camera },
  'nextdoor':       { label: 'Nextdoor',   color: 'text-emerald-500', bg: 'bg-emerald-500/15', Icon: MapPin },
  'messenger':      { label: 'Messenger',  color: 'text-blue-400',    bg: 'bg-blue-500/15',    Icon: MessageCircle },
}

const URGENCY_CONFIG = {
  high:   { label: 'Urgent', color: 'text-rose-500',   bg: 'bg-rose-500/15' },
  medium: { label: 'Normal', color: 'text-amber-500',  bg: 'bg-amber-500/15' },
  low:    { label: 'Low',    color: 'text-ink-400',    bg: 'bg-ink-500/15' },
}

const STATUS_FILTERS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Leads' },
  { value: 'new', label: 'New' },
  { value: 'responded', label: 'Responded' },
  { value: 'captured', label: 'Captured' },
  { value: 'dismissed', label: 'Dismissed' },
]

interface RespondModalProps {
  lead: SocialLead
  onClose: () => void
}

function RespondModal({ lead, onClose }: RespondModalProps) {
  const { templates, respondToLead } = useSocialStore()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const relevantTemplates = templates.filter(t =>
    t.platforms.includes(lead.platform) && t.category !== 'instagram'
  )

  function handleTemplateSelect(id: string) {
    const tmpl = templates.find(t => t.id === id)
    if (!tmpl) return
    setSelectedTemplate(id)
    const firstName = lead.author.split(' ')[0].replace('@', '')
    setMessage(tmpl.content.replace('[Name]', firstName).replace('[City]', lead.location.split(',')[0]))
  }

  function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setTimeout(() => {
      respondToLead(lead.id, selectedTemplate || 'custom', message)
      setSending(false)
      setSent(true)
      setTimeout(onClose, 1200)
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl bg-card border border-ink-200 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <div>
            <p className="text-[13px] font-semibold text-ink-900">Respond to {lead.author}</p>
            <p className="text-[12px] text-ink-500">{lead.groupOrPage}</p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-700 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Original post */}
          <div className="rounded-xl bg-page border border-ink-200 p-3">
            <p className="text-[12px] text-ink-400 leading-relaxed italic">&quot;{lead.content}&quot;</p>
          </div>

          {/* Template picker */}
          <div>
            <p className="text-[12px] font-medium text-ink-400 mb-2">Quick Templates</p>
            <div className="flex flex-wrap gap-1.5">
              {relevantTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t.id)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors',
                    selectedTemplate === t.id
                      ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                      : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                  )}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message editor */}
          <div>
            <p className="text-[12px] font-medium text-ink-400 mb-1.5">Your Response</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              placeholder="Type your response or select a template above..."
              className="w-full rounded-xl bg-page border border-ink-200 px-3 py-2.5 text-[12px] text-ink-700 placeholder:text-ink-400 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <p className="text-right text-[11px] text-ink-400 mt-1">{message.length} chars</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={sending || sent || !message.trim()}
            >
              {sent ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sent!</>
              ) : sending ? (
                <><span className="animate-spin">⟳</span> Sending...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Response</>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Add Lead Modal ──────────────────────────────────────────────────────────

const SOUTH_BAY_CITIES = [
  'Long Beach', 'Torrance', 'El Segundo', 'Manhattan Beach', 'Redondo Beach',
  'Hawthorne', 'Lakewood', 'Carson', 'Signal Hill', 'Compton', 'Gardena',
  'Inglewood', 'Lawndale', 'Hermosa Beach', 'Bellflower', 'West Carson',
]

function autoDetectUrgency(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()
  if (['asap', 'today', 'tonight', 'urgently', 'immediately', 'last minute', 'this week'].some(kw => lower.includes(kw))) return 'high'
  if (['next week', 'soon', 'this month'].some(kw => lower.includes(kw))) return 'medium'
  return 'low'
}

function autoDetectLocation(text: string): string {
  const lower = text.toLowerCase()
  const found = SOUTH_BAY_CITIES.find(c => lower.includes(c.toLowerCase()))
  return found ? `${found}, CA` : ''
}

const PLATFORMS: { value: LeadPlatform; label: string }[] = [
  { value: 'facebook-group', label: 'FB Group' },
  { value: 'facebook-page',  label: 'FB Page' },
  { value: 'instagram',      label: 'Instagram' },
  { value: 'nextdoor',       label: 'Nextdoor' },
]

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { addLead } = useSocialStore()
  const [platform, setPlatform] = useState<LeadPlatform>('facebook-group')
  const [author, setAuthor] = useState('')
  const [groupOrPage, setGroupOrPage] = useState('')
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('low')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleContentChange(val: string) {
    setContent(val)
    setUrgency(autoDetectUrgency(val))
    const detectedLocation = autoDetectLocation(val)
    if (detectedLocation && !location) setLocation(detectedLocation)
  }

  async function handleSave() {
    if (!content.trim() || !author.trim()) return
    setSaving(true)
    setError(null)
    try {
      await addLead({ platform, author: author.trim(), groupOrPage: groupOrPage.trim(), content: content.trim(), location: location.trim(), urgency })
      setSaved(true)
      setTimeout(onClose, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl bg-card border border-ink-200 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <div>
            <p className="text-[13px] font-semibold text-ink-900">Add Lead Manually</p>
            <p className="text-[12px] text-ink-500">Paste a post you found — saved as a real lead in the database</p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-700 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Platform */}
          <div>
            <p className="text-[12px] font-medium text-ink-400 mb-1.5">Platform</p>
            <div className="flex gap-1.5 flex-wrap">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                    platform === p.value
                      ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                      : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Author + Group */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[12px] font-medium text-ink-400 mb-1.5">Author name *</p>
              <Input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Ashley M."
                className="text-[12px]"
              />
            </div>
            <div>
              <p className="text-[12px] font-medium text-ink-400 mb-1.5">Group / Page</p>
              <Input
                value={groupOrPage}
                onChange={e => setGroupOrPage(e.target.value)}
                placeholder="Long Beach Moms"
                className="text-[12px]"
              />
            </div>
          </div>

          {/* Post content */}
          <div>
            <p className="text-[12px] font-medium text-ink-400 mb-1.5">Post content *</p>
            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              rows={5}
              placeholder="Paste the Facebook post or message here..."
              className="w-full rounded-xl bg-page border border-ink-200 px-3 py-2.5 text-[12px] text-ink-700 placeholder:text-ink-400 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Location + Urgency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[12px] font-medium text-ink-400 mb-1.5">Location</p>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Long Beach, CA"
                className="text-[12px]"
              />
            </div>
            <div>
              <p className="text-[12px] font-medium text-ink-400 mb-1.5">Urgency (auto-detected)</p>
              <div className="flex gap-1.5">
                {(['high', 'medium', 'low'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    className={cn(
                      'flex-1 rounded-lg border py-1.5 text-[11px] font-medium capitalize transition-colors',
                      urgency === u && u === 'high'   && 'border-rose-500/60 bg-rose-500/15 text-rose-500',
                      urgency === u && u === 'medium' && 'border-amber-500/60 bg-amber-500/15 text-amber-500',
                      urgency === u && u === 'low'    && 'border-ink-300 bg-ink-500/10 text-ink-500',
                      urgency !== u && 'border-ink-200 text-ink-400 hover:border-ink-100'
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-[12px] text-rose-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || saved || !content.trim() || !author.trim()}
            >
              {saved ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Saved!</>
              ) : saving ? (
                <><span className="animate-spin">⟳</span> Saving...</>
              ) : (
                <><Plus className="h-4 w-4" /> Save Lead</>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

interface LeadCardProps {
  lead: SocialLead
  onRespond: () => void
}

function LeadCard({ lead, onRespond }: LeadCardProps) {
  const { captureLead, dismissLead, restoreLead } = useSocialStore()
  const [expanded, setExpanded] = useState(false)
  const platform = PLATFORM_CONFIG[lead.platform]
  const urgency = URGENCY_CONFIG[lead.urgency]
  const PlatformIcon = platform.Icon

  const isNew = lead.status === 'new'
  const isResponded = lead.status === 'responded'
  const isCaptured = lead.status === 'captured'
  const isDismissed = lead.status === 'dismissed'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'rounded-xl border transition-colors',
        isCaptured && 'border-emerald-500/30 bg-emerald-500/[0.04]',
        isResponded && 'border-violet-500/20 bg-violet-500/[0.03]',
        isDismissed && 'border-ink-200 bg-transparent opacity-50',
        isNew && 'border-ink-200 bg-card',
      )}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold', platform.bg, platform.color)}>
            {lead.authorInitials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-ink-900">{lead.author}</span>
              <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', platform.bg, platform.color)}>
                <PlatformIcon className="h-2.5 w-2.5" />
                {platform.label}
              </span>
              {isNew && (
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', urgency.bg, urgency.color)}>
                  {urgency.label}
                </span>
              )}
              {isCaptured && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-500">
                  Lead Captured
                </span>
              )}
              {isResponded && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-violet-500/15 text-violet-400">
                  Responded
                </span>
              )}
            </div>

            <p className="mt-0.5 text-[11px] text-ink-500 truncate">{lead.groupOrPage}</p>
            <p className="mt-1.5 text-[12px] text-ink-400 line-clamp-2 leading-relaxed">{lead.content}</p>

            <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(lead.postedAt), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lead.location}
              </span>
              {(lead.likes !== undefined) && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {lead.likes}
                </span>
              )}
              {(lead.comments !== undefined) && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {lead.comments}
                </span>
              )}
            </div>
          </div>

          <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-ink-400 transition-transform', expanded && 'rotate-180')} />
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
            <div className="px-4 pb-4 space-y-3">
              {/* Full post */}
              <div className="rounded-xl bg-page border border-ink-200 p-3">
                <p className="text-[12px] text-ink-700 leading-relaxed">{lead.content}</p>
              </div>

              {/* Response info if responded */}
              {(isResponded || isCaptured) && lead.respondedAt && (
                <div className="flex items-center gap-2 text-[12px] text-ink-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Responded {formatDistanceToNow(new Date(lead.respondedAt), { addSuffix: true })}
                </div>
              )}

              {/* Action buttons */}
              {!isDismissed && (
                <div className="flex gap-2 flex-wrap">
                  {isNew && (
                    <>
                      <Button size="sm" className="flex-1 min-w-[120px]" onClick={onRespond}>
                        <MessageCircle className="h-3.5 w-3.5" /> Respond
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => captureLead(lead.id)}>
                        <UserPlus className="h-3.5 w-3.5" /> Mark as Lead
                      </Button>
                      <Button size="sm" variant="outline" className="text-ink-500" onClick={() => dismissLead(lead.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {isResponded && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => captureLead(lead.id)}>
                        <UserPlus className="h-3.5 w-3.5" /> Mark as Lead
                      </Button>
                      <Button size="sm" onClick={onRespond} className="flex-1 min-w-[120px]">
                        <MessageCircle className="h-3.5 w-3.5" /> Follow Up
                      </Button>
                    </>
                  )}
                  {isCaptured && (
                    <div className="flex items-center gap-2 text-[12px] text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Added to leads — book from the Scheduling tab!</span>
                    </div>
                  )}
                </div>
              )}
              {isDismissed && (
                <button
                  onClick={() => restoreLead(lead.id)}
                  className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-700 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function LeadMonitor() {
  const { leads, fetchLeads, leadsLoading } = useSocialStore()
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<LeadPlatform | 'all'>('all')
  const [search, setSearch] = useState('')
  const [respondingTo, setRespondingTo] = useState<SocialLead | null>(null)
  const [addingLead, setAddingLead] = useState(false)

  // Load real leads from Supabase on first render
  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filtered = leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (platformFilter !== 'all' && l.platform !== platformFilter) return false
    if (search && !l.content.toLowerCase().includes(search.toLowerCase()) &&
        !l.author.toLowerCase().includes(search.toLowerCase()) &&
        !l.location.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const newCount = leads.filter(l => l.status === 'new').length
  const respondedCount = leads.filter(l => l.status === 'responded').length
  const capturedCount = leads.filter(l => l.status === 'captured').length
  const urgentCount = leads.filter(l => l.status === 'new' && l.urgency === 'high').length

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="New Leads" value={newCount} tone="violet" />
        <StatTile label="Urgent" value={urgentCount} tone="rose" />
        <StatTile label="Responded" value={respondedCount} tone="amber" />
        <StatTile label="Captured" value={capturedCount} tone="emerald" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
                <Eye className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <CardTitle>Social Lead Monitor</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {urgentCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-[12px] font-medium text-rose-500">
                  <AlertTriangle className="h-3 w-3" />
                  {urgentCount} urgent
                </span>
              )}
              <button
                onClick={() => fetchLeads()}
                disabled={leadsLoading}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1 text-[12px] text-ink-500 hover:border-ink-100 hover:text-ink-700 transition-colors disabled:opacity-40"
                title="Refresh leads"
              >
                <RefreshCw className={`h-3 w-3 ${leadsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setAddingLead(true)}
                className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[12px] font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Lead
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search by keyword, author, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-[12px]"
          />

          <div className="flex flex-wrap gap-2">
            {/* Status filter */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors',
                    statusFilter === f.value
                      ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                      : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-ink-200 self-center" />

            {/* Platform filter */}
            <div className="flex gap-1 flex-wrap">
              {[
                { value: 'all', label: 'All Platforms' },
                { value: 'facebook-group', label: 'FB Groups' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'nextdoor', label: 'Nextdoor' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setPlatformFilter(f.value as any)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors',
                    platformFilter === f.value
                      ? 'border-purple-500/60 bg-purple-500/15 text-purple-500'
                      : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead feed */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-ink-200 bg-card p-10 text-center"
            >
              <Filter className="h-8 w-8 text-ink-400 mx-auto mb-3" />
              <p className="text-[13px] text-ink-500">No leads match your filters</p>
            </motion.div>
          ) : (
            filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onRespond={() => setRespondingTo(lead)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Respond modal */}
      <AnimatePresence>
        {respondingTo && (
          <RespondModal
            lead={respondingTo}
            onClose={() => setRespondingTo(null)}
          />
        )}
      </AnimatePresence>

      {/* Add lead modal */}
      <AnimatePresence>
        {addingLead && (
          <AddLeadModal onClose={() => setAddingLead(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
