'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, ThumbsUp, Clock, MapPin, CheckCircle2,
  XCircle, UserPlus, RotateCcw, Send, ChevronDown, Filter,
  Globe2, Camera, AlertTriangle, Eye,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useSocialStore } from '@/store/useSocialStore'
import { SocialLead, LeadPlatform, LeadStatus } from '@/types'
import { cn } from '@/lib/utils'

const PLATFORM_CONFIG: Record<LeadPlatform, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  'facebook-group': { label: 'FB Group', color: 'text-blue-400', bg: 'bg-blue-500/15', Icon: Globe2 },
  'facebook-page': { label: 'FB Page', color: 'text-blue-400', bg: 'bg-blue-500/15', Icon: Globe2 },
  'instagram': { label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-500/15', Icon: Camera },
  'nextdoor': { label: 'Nextdoor', color: 'text-emerald-400', bg: 'bg-emerald-500/15', Icon: MapPin },
}

const URGENCY_CONFIG = {
  high: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/15' },
  medium: { label: 'Normal', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  low: { label: 'Low', color: 'text-slate-400', bg: 'bg-slate-500/15' },
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
        className="w-full max-w-2xl rounded-2xl bg-[#0d1321] border border-[#1e2a3a] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2a3a]">
          <div>
            <p className="text-sm font-semibold text-white">Respond to {lead.author}</p>
            <p className="text-xs text-slate-500">{lead.groupOrPage}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Original post */}
          <div className="rounded-xl bg-[#070b14] border border-[#1e2a3a] p-3">
            <p className="text-xs text-slate-400 leading-relaxed italic">"{lead.content}"</p>
          </div>

          {/* Template picker */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Quick Templates</p>
            <div className="flex flex-wrap gap-1.5">
              {relevantTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t.id)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                    selectedTemplate === t.id
                      ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300'
                      : 'border-[#1e2a3a] text-slate-500 hover:border-[#2d3f56] hover:text-slate-400'
                  )}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message editor */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Your Response</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              placeholder="Type your response or select a template above..."
              className="w-full rounded-xl bg-[#070b14] border border-[#1e2a3a] px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <p className="text-right text-[10px] text-slate-600 mt-1">{message.length} chars</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={sending || sent || !message.trim()}
            >
              {sent ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sent!</>
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
        'rounded-xl border transition-all',
        isCaptured && 'border-emerald-500/30 bg-emerald-500/[0.04]',
        isResponded && 'border-indigo-500/20 bg-indigo-500/[0.03]',
        isDismissed && 'border-[#1a2537] bg-transparent opacity-50',
        isNew && 'border-[#1e2a3a] bg-[#0d1321]',
      )}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold', platform.bg, platform.color)}>
            {lead.authorInitials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-200">{lead.author}</span>
              <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', platform.bg, platform.color)}>
                <PlatformIcon className="h-2.5 w-2.5" />
                {platform.label}
              </span>
              {isNew && (
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', urgency.bg, urgency.color)}>
                  {urgency.label}
                </span>
              )}
              {isCaptured && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                  Lead Captured
                </span>
              )}
              {isResponded && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-500/15 text-indigo-400">
                  Responded
                </span>
              )}
            </div>

            <p className="mt-0.5 text-[11px] text-slate-500 truncate">{lead.groupOrPage}</p>
            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">{lead.content}</p>

            <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-600">
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

          <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-slate-600 transition-transform', expanded && 'rotate-180')} />
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
              <div className="rounded-xl bg-[#070b14] border border-[#1e2a3a] p-3">
                <p className="text-xs text-slate-300 leading-relaxed">{lead.content}</p>
              </div>

              {/* Response info if responded */}
              {(isResponded || isCaptured) && lead.respondedAt && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
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
                      <Button size="sm" variant="outline" className="text-slate-500" onClick={() => dismissLead(lead.id)}>
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
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Added to leads — book from the Scheduling tab!</span>
                    </div>
                  )}
                </div>
              )}
              {isDismissed && (
                <button
                  onClick={() => restoreLead(lead.id)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
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
  const { leads } = useSocialStore()
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<LeadPlatform | 'all'>('all')
  const [search, setSearch] = useState('')
  const [respondingTo, setRespondingTo] = useState<SocialLead | null>(null)

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
        {[
          { label: 'New Leads', value: newCount, color: 'text-indigo-400', glow: 'shadow-[0_0_16px_rgba(99,102,241,0.1)]' },
          { label: 'Urgent', value: urgentCount, color: 'text-red-400', glow: 'shadow-[0_0_16px_rgba(239,68,68,0.1)]' },
          { label: 'Responded', value: respondedCount, color: 'text-amber-400', glow: '' },
          { label: 'Captured', value: capturedCount, color: 'text-emerald-400', glow: 'shadow-[0_0_16px_rgba(16,185,129,0.1)]' },
        ].map(s => (
          <div key={s.label} className={cn('kpi-card rounded-xl p-3', s.glow)}>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={cn('mt-0.5 text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
                <Eye className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <CardTitle>Social Lead Monitor</CardTitle>
            </div>
            {urgentCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400">
                <AlertTriangle className="h-3 w-3" />
                {urgentCount} urgent
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search by keyword, author, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs"
          />

          <div className="flex flex-wrap gap-2">
            {/* Status filter */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                    statusFilter === f.value
                      ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300'
                      : 'border-[#1e2a3a] text-slate-500 hover:border-[#2d3f56] hover:text-slate-400'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-[#1e2a3a] self-center" />

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
                    'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                    platformFilter === f.value
                      ? 'border-violet-500/60 bg-violet-500/15 text-violet-300'
                      : 'border-[#1e2a3a] text-slate-500 hover:border-[#2d3f56] hover:text-slate-400'
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
              className="rounded-xl border border-[#1e2a3a] bg-[#0d1321] p-10 text-center"
            >
              <Filter className="h-8 w-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No leads match your filters</p>
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
    </div>
  )
}
