'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Send, Sparkles, Bot, CheckCheck,
  Clock, RefreshCw, Tag, Zap, Phone,
  MoreVertical, ArrowRight, Flame, Star, Inbox
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SocialLead } from '@/types'

type MessageFrom = 'them' | 'us'
interface ThreadMessage { from: MessageFrom; text: string; time: string }

interface Conversation {
  id: string
  name: string
  avatar: string
  avatarColor: string
  source: string
  city: string
  unread: number
  lastTime: string
  lastPreview: string
  status: 'new-lead' | 'responded' | 'booked' | 'dismissed'
  aiScore: number
  thread: ThreadMessage[]
  aiInsight: string
  aiLabel: string
}

const AVATAR_COLORS = [
  '#5EEAD4', '#22c55e', '#f59e0b', '#a855f7',
  '#0ea5e9', '#64748b', '#ec4899', '#f97316',
]

function colorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function urgencyToScore(urgency: SocialLead['urgency']): number {
  return urgency === 'high' ? 90 : urgency === 'medium' ? 65 : 30
}

function toConversation(lead: SocialLead): Conversation {
  const thread: ThreadMessage[] = [
    { from: 'them', text: lead.content, time: new Date(lead.postedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) },
  ]
  if (lead.responseUsed) {
    thread.push({ from: 'us', text: lead.responseUsed, time: lead.respondedAt ? new Date(lead.respondedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '' })
  }

  const statusMap: Record<SocialLead['status'], Conversation['status']> = {
    new: 'new-lead',
    responded: 'responded',
    captured: 'booked',
    dismissed: 'dismissed',
  }

  const aiScore = urgencyToScore(lead.urgency)
  const aiLabel = lead.status === 'new' ? (lead.urgency === 'high' ? 'Hot Lead' : 'New Lead')
    : lead.status === 'responded' ? 'Quote Sent'
    : lead.status === 'captured' ? 'Booked'
    : 'Dismissed'

  const aiInsight = lead.urgency === 'high'
    ? `High-urgency lead from ${lead.location || 'your area'}. Respond quickly to maximize close rate.`
    : lead.urgency === 'medium'
    ? `Interested lead from ${lead.location || 'your area'}. Provide a clear quote to move forward.`
    : `Low-urgency lead. Follow up with a pricing overview when available.`

  return {
    id: lead.id,
    name: lead.author,
    avatar: lead.authorInitials || lead.author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    avatarColor: colorForId(lead.id),
    source: lead.platform,
    city: lead.location,
    unread: lead.status === 'new' ? 1 : 0,
    lastTime: relativeTime(lead.postedAt),
    lastPreview: lead.content.slice(0, 80),
    status: statusMap[lead.status],
    aiScore,
    thread,
    aiInsight,
    aiLabel,
  }
}

function generateDraft(conv: Conversation): string {
  const last = conv.thread[conv.thread.length - 1].text.toLowerCase()
  const firstName = conv.name.split(' ')[0]
  if (last.includes('how much') || last.includes('charge') || last.includes('price') || last.includes('cost')) {
    return `Hi ${firstName}! Thanks for reaching out 😊 For a standard clean we start at $165, and deep cleans from $245. We serve ${conv.city || 'your area'} and usually have availability within the week. Want to set up a time?`
  }
  if (last.includes('available') || last.includes('opening') || last.includes('schedule') || last.includes('appointment')) {
    return `Hi ${firstName}! Yes, we have openings coming up — I can lock in a time that works for you. What day/time is best? 🗓️`
  }
  if (last.includes('eco') || last.includes('friendly') || last.includes('non-toxic') || last.includes('safe')) {
    return `Hi ${firstName}! Great question — yes, we use plant-based, non-toxic products by default at no extra charge. Safe for kids and pets 🌿 Want to book a clean?`
  }
  if (last.includes('refer') || last.includes('recommend') || last.includes('neighbor')) {
    return `Hi ${firstName}! So great that someone sent you our way 😊 We'd love to take care of your home too! What kind of cleaning are you looking for?`
  }
  return `Hi ${firstName}! Thanks for reaching out to Kardama 😊 We'd love to help keep your home spotless. Could you share your address area and what kind of clean you need so I can give you an accurate quote?`
}

const STATUS_CONFIG: Record<Conversation['status'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  'new-lead':  { label: 'New Lead',   variant: 'default' },
  'responded': { label: 'Responded',  variant: 'warning' },
  'booked':    { label: 'Booked',     variant: 'success' },
  'dismissed': { label: 'Dismissed',  variant: 'neutral' },
}

export function InboxClient({ leads }: { leads: SocialLead[] }) {
  const conversations = useMemo(() => leads.map(toConversation), [leads])

  const [selected, setSelected] = useState<Conversation | null>(conversations[0] ?? null)
  const [draft, setDraft] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [mobilePanel, setMobilePanel] = useState<'list' | 'thread' | 'details'>('list')
  const [threads, setThreads] = useState<Record<string, ThreadMessage[]>>(
    Object.fromEntries(conversations.map(c => [c.id, c.thread]))
  )

  const filtered = conversations.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.city.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0)

  function handleAiDraft() {
    if (!selected) return
    setAiGenerating(true)
    setTimeout(() => {
      setDraft(generateDraft(selected))
      setAiGenerating(false)
    }, 900)
  }

  async function handleSend() {
    if (!draft.trim() || !selected) return
    const newMsg: ThreadMessage = {
      from: 'us',
      text: draft,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    }
    setThreads(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] || []), newMsg] }))
    setSentIds(prev => new Set(prev).add(selected.id))
    setDraft('')
    // Persist response to DB
    try {
      await fetch(`/api/leads/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'responded', response_used: draft }),
      })
    } catch {
      // fire-and-forget
    }
  }

  const currentThread = selected ? (threads[selected.id] || selected.thread) : []

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center h-[calc(100vh-60px)]">
        <Inbox className="h-12 w-12 text-ink-300" />
        <div>
          <p className="text-[14px] font-semibold text-ink-700">No leads yet</p>
          <p className="text-[13px] text-ink-400 mt-1">
            Leads from Facebook, Instagram, and Nextdoor will appear here automatically.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] overflow-hidden">
      {/* Mobile tab bar */}
      <div className="flex md:hidden flex-shrink-0 border-b border-line bg-rail">
        {(['list', 'thread', 'details'] as const).map(panel => (
          <button
            key={panel}
            onClick={() => setMobilePanel(panel)}
            className={cn(
              'flex-1 py-2.5 text-[12.5px] font-medium capitalize transition-colors',
              mobilePanel === panel
                ? 'text-mint-500 border-b-2 border-mint-500 bg-mint-500/[0.05]'
                : 'text-ink-500',
            )}
          >
            {panel === 'list' ? 'Inbox' : panel === 'thread' ? 'Thread' : 'Details'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: Conversation List */}
        <div className={cn(
          'flex-shrink-0 flex flex-col border-line bg-rail',
          'w-full md:w-[340px] md:border-r',
          mobilePanel !== 'list' ? 'hidden md:flex' : 'flex',
        )}>
          <div className="border-b border-line p-[18px]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-[16px] w-[16px] text-mint-500" />
                <h2 className="text-[15px] font-semibold text-ink-900 tracking-[-0.01em]">AI Inbox</h2>
                {totalUnread > 0 && (
                  <span className="num flex items-center justify-center rounded-full bg-mint-500 font-semibold text-page h-[18px] min-w-[18px] px-[5px] text-[10.5px]">
                    {totalUnread}
                  </span>
                )}
              </div>
              <div className="ai-pill">
                <Zap className="h-3 w-3" />
                AI Active
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
              <input
                className="w-full rounded-[8px] bg-soft border border-line focus:outline-none focus:border-mint-500/40 py-[9px] pl-9 pr-3 text-[12.5px] text-ink-700 placeholder:text-ink-400"
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mt-3">
              {['all', 'new-lead', 'booked', 'responded'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    'flex-shrink-0 rounded-[6px] font-medium transition-colors px-2.5 py-[5px] text-[12px]',
                    filterStatus === f
                      ? 'bg-mint-500/12 text-mint-500'
                      : 'text-ink-500 hover:text-ink-700 hover:bg-soft',
                  )}
                >
                  {f === 'all' ? 'All' : f === 'new-lead' ? 'New Leads' : f === 'booked' ? 'Booked' : 'Responded'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[13px] text-ink-400">No conversations match</p>
              </div>
            ) : filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => { setSelected(conv); setDraft(''); setMobilePanel('thread') }}
                className={cn(
                  'w-full flex items-start gap-3 text-left transition-colors border-b border-line px-4 py-3.5',
                  selected?.id === conv.id ? 'bg-mint-500/[0.06]' : 'hover:bg-soft',
                )}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="flex items-center justify-center rounded-full font-semibold text-page w-10 h-10 text-[12.5px]"
                    style={{ background: conv.avatarColor }}
                  >
                    {conv.avatar}
                  </div>
                  {conv.unread > 0 && (
                    <span className="num absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-mint-500 font-semibold text-page h-4 min-w-4 px-1 text-[10px] border-2 border-rail">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-ink-900 truncate">{conv.name}</span>
                    <span className="text-[11px] text-ink-400 flex-shrink-0 ml-2">{conv.lastTime}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-[5px]">
                    <Badge variant={STATUS_CONFIG[conv.status].variant}>
                      {STATUS_CONFIG[conv.status].label}
                    </Badge>
                    {conv.city && <span className="text-[11.5px] text-ink-400">{conv.city}</span>}
                  </div>
                  <p className="text-[12px] text-ink-500 leading-[1.45] truncate">{conv.lastPreview}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Thread + Composer */}
        <div className={cn(
          'flex flex-1 flex-col overflow-hidden',
          mobilePanel !== 'thread' ? 'hidden md:flex' : 'flex',
        )}>
          {selected ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 flex-col overflow-hidden"
              >
                {/* Thread header */}
                <div className="flex items-center justify-between border-b border-line bg-rail px-6 py-3.5">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex items-center justify-center rounded-full font-semibold text-page flex-shrink-0 w-10 h-10 text-[12.5px]"
                      style={{ background: selected.avatarColor }}
                    >
                      {selected.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[14px] font-semibold text-ink-900 tracking-[-0.01em]">{selected.name}</span>
                        <Badge variant={STATUS_CONFIG[selected.status].variant}>
                          {STATUS_CONFIG[selected.status].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-[3px]">
                        {selected.city && <span className="text-[12px] text-ink-500">{selected.city}</span>}
                        {selected.city && <span className="text-ink-400">·</span>}
                        <span className="text-[12px] text-ink-500 capitalize">{selected.source.replace('-', ' ')}</span>
                        <span className="text-ink-400">·</span>
                        <span
                          className={cn(
                            'num text-[12px] font-medium',
                            selected.aiScore >= 80 ? 'text-emerald-500' : selected.aiScore >= 50 ? 'text-amber-500' : 'text-ink-500',
                          )}
                        >
                          AI Score: {selected.aiScore}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </Button>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="h-4 w-4 text-ink-500" />
                    </Button>
                  </div>
                </div>

                {/* Message thread */}
                <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5">
                  {currentThread.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn('flex gap-2.5', msg.from === 'us' ? 'justify-end' : 'justify-start')}
                    >
                      {msg.from === 'them' && (
                        <div
                          className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-page w-[30px] h-[30px] mt-0.5 text-[11px]"
                          style={{ background: selected.avatarColor }}
                        >
                          {selected.avatar}
                        </div>
                      )}
                      <div className={cn('max-w-[72%]', msg.from === 'us' ? 'items-end' : 'items-start', 'flex flex-col gap-1.5')}>
                        <div
                          className={cn(
                            'rounded-[14px] px-3.5 py-2.5 text-[13px] leading-[1.55]',
                            msg.from === 'us'
                              ? 'bg-gradient-to-b from-mint-400 to-mint-600 text-page rounded-tr-sm'
                              : 'bg-elev text-ink-900 rounded-tl-sm border border-line',
                          )}
                        >
                          {msg.text}
                        </div>
                        <div
                          className={cn('flex items-center gap-1.5 text-[11px] text-ink-400', msg.from === 'us' ? 'flex-row-reverse' : '')}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{msg.time}</span>
                          {msg.from === 'us' && <CheckCheck className="h-3 w-3 text-mint-500" />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* AI Insight bar */}
                <div className="rounded-[10px] border border-mint-500/20 bg-mint-500/[0.05] mx-6 mb-3.5 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-mint-500/12">
                      <Bot className="h-4 w-4 text-mint-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-[3px]">
                        <span className="text-[12px] font-medium text-mint-500">AI Insight</span>
                        {selected.aiScore >= 80 && <Flame className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      <p className="text-[13px] text-ink-700 leading-[1.5]">{selected.aiInsight}</p>
                    </div>
                    <Button
                      size="sm"
                      className="flex-shrink-0"
                      onClick={handleAiDraft}
                      disabled={aiGenerating}
                    >
                      {aiGenerating ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {aiGenerating ? 'Drafting…' : 'AI Draft'}
                    </Button>
                  </div>
                </div>

                {/* Composer */}
                <div className="px-6 pb-[18px]">
                  <div className="relative rounded-[10px] border border-line bg-card focus-within:border-mint-500/40 transition-colors">
                    <textarea
                      className="w-full resize-none rounded-[10px] bg-transparent focus:outline-none px-4 pt-3.5 pb-[50px] text-[13px] text-ink-700 leading-[1.55]"
                      rows={3}
                      placeholder="Type a message or click AI Draft…"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
                      }}
                    />
                    <div className="absolute flex items-center gap-3 bottom-2.5 right-3">
                      <span className="text-[11px] text-ink-400">⌘+Enter to send</span>
                      <Button onClick={handleSend} disabled={!draft.trim()} size="sm">
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-1 items-center justify-center flex-col gap-3 text-center">
              <MessageSquare className="h-10 w-10 text-ink-300" />
              <p className="text-[13px] text-ink-400">Select a conversation</p>
            </div>
          )}
        </div>

        {/* Right sidebar: Lead scoring */}
        {selected && (
          <div className={cn(
            'flex-shrink-0 border-line bg-rail space-y-5 p-[18px]',
            'w-full md:w-64 md:border-l',
            mobilePanel !== 'details' ? 'hidden md:block' : 'block overflow-y-auto',
          )}>
            <div>
              <p className="text-[12px] font-medium text-ink-500 mb-2.5">AI Lead Score</p>
              <div className="text-center pt-3.5 pb-2.5">
                <div
                  className={cn(
                    'num text-[44px] font-semibold tracking-[-0.025em] leading-none',
                    selected.aiScore >= 80 ? 'text-emerald-500' : selected.aiScore >= 50 ? 'text-amber-500' : 'text-ink-500',
                  )}
                >
                  {selected.aiScore}
                </div>
                <div className="text-[12px] text-ink-400 mt-1">out of 100</div>
                <div className="rounded-full bg-elev overflow-hidden mt-3 h-1.5">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      selected.aiScore >= 80 ? 'bg-emerald-500' : selected.aiScore >= 50 ? 'bg-amber-500' : 'bg-ink-500',
                    )}
                    style={{ width: `${selected.aiScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-[18px]">
              <p className="text-[12px] font-medium text-ink-500 mb-2.5">Details</p>
              <div className="space-y-2.5">
                {[
                  ['Source', selected.source.replace(/-/g, ' ')],
                  ['Location', selected.city || '—'],
                  ['Messages', String(currentThread.length)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[12px] text-ink-400">{label}</span>
                    <span className="text-[12px] text-ink-700 font-medium capitalize">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-ink-400">Stage</span>
                  <Badge variant={STATUS_CONFIG[selected.status].variant}>
                    {STATUS_CONFIG[selected.status].label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-[18px]">
              <p className="text-[12px] font-medium text-ink-500 mb-2.5">Quick Actions</p>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Tag className="h-3.5 w-3.5" />
                  Add Label
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Star className="h-3.5 w-3.5" />
                  Mark Priority
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Book Job
                </Button>
              </div>
            </div>

            <div className="border-t border-line pt-[18px]">
              <p className="text-[12px] font-medium text-ink-500 mb-2.5">Pipeline Today</p>
              <div className="space-y-2">
                {(['new-lead', 'responded', 'booked'] as const).map(s => {
                  const count = conversations.filter(c => c.status === s).length
                  return (
                    <div key={s} className="flex justify-between items-center">
                      <span className="text-[12px] text-ink-400 capitalize">{s.replace('-', ' ')}</span>
                      <span className="num text-[13px] font-semibold text-ink-700">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
