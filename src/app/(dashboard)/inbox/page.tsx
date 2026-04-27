'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Send, Sparkles, Bot, CheckCheck,
  Clock, RefreshCw, Tag, Zap, Phone,
  MoreVertical, ArrowRight, Flame, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type MessageFrom = 'them' | 'us'
interface ThreadMessage { from: MessageFrom; text: string; time: string }
interface Conversation {
  id: string; name: string; avatar: string; avatarColor: string
  source: 'facebook' | 'referral' | 'yelp' | 'text'
  city: string; unread: number; lastTime: string; lastPreview: string
  status: 'new-lead' | 'quote-sent' | 'booked' | 'info-request' | 'lost' | 'referral'
  aiScore: number; thread: ThreadMessage[]
  aiInsight: string; aiLabel: string
}

const CONVERSATIONS: Conversation[] = [
  {
    id: 'm1', name: 'Patricia Nguyen', avatar: 'PN', avatarColor: '#6366f1',
    source: 'facebook', city: 'Long Beach', unread: 3, lastTime: '2m ago',
    lastPreview: 'How much do you charge for a 3 bed 2 bath?',
    status: 'new-lead', aiScore: 92,
    thread: [
      { from: 'them', text: 'Hi! I found you through the Long Beach Moms group 😊 Do you do regular cleaning?', time: '10:14 AM' },
      { from: 'them', text: 'I have a 3 bed 2 bath in Long Beach and need someone reliable.', time: '10:15 AM' },
      { from: 'them', text: 'How much do you charge for a 3 bed 2 bath?', time: '10:22 AM' },
    ],
    aiInsight: 'High-value lead from Long Beach Moms Group. 3BD/2BA regular = $155–175/visit. Mention bi-weekly discount to close.',
    aiLabel: 'Hot Lead',
  },
  {
    id: 'm2', name: 'James Kowalski', avatar: 'JK', avatarColor: '#22c55e',
    source: 'facebook', city: 'Torrance', unread: 1, lastTime: '18m ago',
    lastPreview: 'Is this Saturday still available?',
    status: 'quote-sent', aiScore: 78,
    thread: [
      { from: 'them', text: 'Hey, I need a move-out clean for my apartment in Torrance by end of month.', time: '9:45 AM' },
      { from: 'us', text: 'Hi James! We specialize in move-out cleans 💪 For a standard apartment it\'s $280–$380. Saturday we have 9am and 11am open. Want to lock one in?', time: '9:50 AM' },
      { from: 'them', text: 'Is this Saturday still available?', time: '10:04 AM' },
    ],
    aiInsight: 'Move-out clean = one-time high-margin job. Reply quickly — move-out customers shop around. Confirm Saturday 9am.',
    aiLabel: 'Quote Sent',
  },
  {
    id: 'm3', name: 'Michelle Torres', avatar: 'MT', avatarColor: '#f59e0b',
    source: 'facebook', city: 'Redondo Beach', unread: 0, lastTime: '1h ago',
    lastPreview: 'Great! See you Tuesday at 10am ✓',
    status: 'booked', aiScore: 100,
    thread: [
      { from: 'them', text: 'Do you have any openings next Tuesday morning?', time: '8:30 AM' },
      { from: 'us', text: 'Yes! Tuesday 10am works perfectly. That\'ll be $175 for a standard 3BR. Should I put you on the schedule?', time: '8:35 AM' },
      { from: 'them', text: 'Yes please! 1205 Catalina Ave, Redondo Beach.', time: '8:40 AM' },
      { from: 'us', text: 'You\'re all set for Tuesday April 29 at 10am 🎉 Team: Jennifer + David. We\'ll send an ETA notification the morning of!', time: '8:42 AM' },
      { from: 'them', text: 'Great! See you Tuesday at 10am ✓', time: '8:45 AM' },
    ],
    aiInsight: 'Booking confirmed for Tue Apr 29. Add to schedule and send arrival notification day-of.',
    aiLabel: 'Booked',
  },
  {
    id: 'm4', name: 'Chris Yamamoto', avatar: 'CY', avatarColor: '#a855f7',
    source: 'referral', city: 'Long Beach', unread: 1, lastTime: '3h ago',
    lastPreview: 'My neighbor Sarah Mitchell recommended you!',
    status: 'referral', aiScore: 88,
    thread: [
      { from: 'them', text: 'Hi! My neighbor Sarah Mitchell recommended your cleaning service. She says you guys do amazing work!', time: '6:00 AM' },
      { from: 'them', text: 'My neighbor Sarah Mitchell recommended you!', time: '6:01 AM' },
    ],
    aiInsight: 'Referred by existing 5-star customer Sarah Mitchell. Mention her name — trust is already built. Easy close.',
    aiLabel: 'Referral',
  },
  {
    id: 'm5', name: 'Derek Sullivan', avatar: 'DS', avatarColor: '#0ea5e9',
    source: 'facebook', city: 'El Segundo', unread: 2, lastTime: '2h ago',
    lastPreview: 'Do you use eco-friendly products?',
    status: 'info-request', aiScore: 65,
    thread: [
      { from: 'them', text: 'Hi there, do you use eco-friendly, non-toxic cleaning products?', time: '7:15 AM' },
      { from: 'them', text: 'Do you use eco-friendly products?', time: '7:16 AM' },
    ],
    aiInsight: 'Eco-conscious buyer. Confirm plant-based product option (no extra charge) to convert to booking.',
    aiLabel: 'Info Request',
  },
  {
    id: 'm6', name: 'Vanessa Reyes', avatar: 'VR', avatarColor: '#64748b',
    source: 'facebook', city: 'Hawthorne', unread: 0, lastTime: '1d ago',
    lastPreview: 'No thanks, that\'s out of my budget.',
    status: 'lost', aiScore: 12,
    thread: [
      { from: 'them', text: 'Hi how much for a 2BD 1BA basic clean?', time: 'Yesterday' },
      { from: 'us', text: 'Hi Vanessa! For a 2BD/1BA standard clean we charge $135–$155. We also do bi-weekly at $120. Does that work for you?', time: 'Yesterday' },
      { from: 'them', text: 'No thanks, that\'s out of my budget.', time: 'Yesterday' },
    ],
    aiInsight: 'Price-sensitive lead. Consider a first-time 15% discount offer to re-engage.',
    aiLabel: 'Lost',
  },
]

function generateDraft(conv: Conversation, thread: Conversation['thread']): string {
  const last = thread[thread.length - 1].text.toLowerCase()
  const firstName = conv.name.split(' ')[0]
  if (last.includes('how much') || last.includes('charge') || last.includes('price')) {
    return `Hi ${firstName}! Thanks for reaching out 😊 For a 3BD/2BA, our standard clean is $155–$175 and deep clean is $235–$265. We're local to ${conv.city} and availability is usually within the week. Want to set up a recurring bi-weekly schedule? Regulars get priority booking!`
  }
  if (last.includes('saturday') || last.includes('available') || last.includes('opening')) {
    return `Hi ${firstName}! Yes, Saturday is still available — I have 9am and 11am open. Which works for you? I'll get you confirmed right away 🗓️`
  }
  if (last.includes('eco') || last.includes('friendly') || last.includes('non-toxic')) {
    return `Hi ${firstName}! Great question — yes, we use plant-based, non-toxic products by default at no extra charge. Safe for kids and pets too 🌿 Want to book a clean?`
  }
  if (last.includes('recommend') || last.includes('neighbor') || last.includes('mitchell')) {
    return `Hi ${firstName}! So great that Sarah sent you our way — she's been with us for over a year and we love taking care of her home 😊 We'd love to do the same for you! What kind of cleaning are you looking for?`
  }
  return `Hi ${firstName}! Thanks for reaching out to David's Cleaning Service 😊 We'd love to help keep your home spotless. Could you share your address area and what kind of clean you're looking for so I can give you an accurate quote?`
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple' | 'teal' }> = {
  'new-lead': { label: 'New Lead', variant: 'default' },
  'quote-sent': { label: 'Quote Sent', variant: 'warning' },
  'booked': { label: 'Booked', variant: 'success' },
  'info-request': { label: 'Info Request', variant: 'teal' },
  'lost': { label: 'Lost', variant: 'neutral' },
  'referral': { label: 'Referral', variant: 'purple' },
}

const SOURCE_ICON: Record<string, string> = {
  facebook: 'fb', referral: 'ref', yelp: 'ylp', text: 'sms'
}

export default function InboxPage() {
  const [selected, setSelected] = useState<Conversation>(CONVERSATIONS[0])
  const [draft, setDraft] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [mobilePanel, setMobilePanel] = useState<'list' | 'thread' | 'details'>('list')
  const [threads, setThreads] = useState<Record<string, Conversation['thread']>>(
    Object.fromEntries(CONVERSATIONS.map(c => [c.id, c.thread]))
  )

  const filtered = CONVERSATIONS.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.city.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0)

  function handleAiDraft() {
    setAiGenerating(true)
    setTimeout(() => {
      setDraft(generateDraft(selected, threads[selected.id] || selected.thread))
      setAiGenerating(false)
    }, 900)
  }

  function handleSend() {
    if (!draft.trim()) return
    const newMsg: ThreadMessage = { from: 'us', text: draft, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
    setThreads(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] || []), newMsg] }))
    setSentIds(prev => new Set(prev).add(selected.id))
    setDraft('')
  }

  const currentThread = threads[selected.id] || selected.thread

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {/* Mobile tab bar */}
      <div className="flex md:hidden flex-shrink-0 border-b border-[#1e2a3a] bg-[#0a0f1c]">
        {(['list', 'thread', 'details'] as const).map(panel => (
          <button
            key={panel}
            onClick={() => setMobilePanel(panel)}
            className={cn(
              'flex-1 py-2.5 text-xs font-medium capitalize transition-colors',
              mobilePanel === panel
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                : 'text-slate-500'
            )}
          >
            {panel === 'list' ? 'Inbox' : panel === 'thread' ? 'Thread' : 'Details'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
      {/* Left: Conversation List */}
      <div className={cn(
        'flex-shrink-0 flex flex-col border-[#1e2a3a] bg-[#0a0f1c]',
        'w-full md:w-[340px] md:border-r',
        mobilePanel !== 'list' ? 'hidden md:flex' : 'flex'
      )}>
        {/* Header */}
        <div className="border-b border-[#1e2a3a]" style={{ padding: 18 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-[18px] w-[18px] text-indigo-400" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>AI Inbox</h2>
              {totalUnread > 0 && (
                <span className="flex items-center justify-center rounded-full bg-indigo-500 font-bold text-white" style={{ height: 18, minWidth: 18, padding: '0 5px', fontSize: 11 }}>
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20" style={{ padding: '4px 10px' }}>
              <Zap className="h-3 w-3 text-indigo-400" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue-400)' }}>AI Active</span>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              className="w-full rounded-lg bg-[#0d1321] border border-[#1e2a3a] focus:outline-none focus:border-indigo-500/50"
              style={{ padding: '9px 12px 9px 36px', fontSize: 13, color: 'var(--ink-700)' }}
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide" style={{ marginTop: 12 }}>
            {['all', 'new-lead', 'booked', 'quote-sent'].map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={cn(
                  'flex-shrink-0 rounded-md font-medium transition-colors',
                  filterStatus === f
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                )}
                style={{ padding: '5px 10px', fontSize: 11.5 }}
              >
                {f === 'all' ? 'All' : f === 'new-lead' ? 'New Leads' : f === 'booked' ? 'Booked' : 'Quoted'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => { setSelected(conv); setDraft(''); setMobilePanel('thread') }}
              className={cn(
                'w-full flex items-start gap-3.5 text-left transition-colors border-b border-[#1e2a3a]/50',
                selected.id === conv.id ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'
              )}
              style={{ padding: '14px 16px' }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="flex items-center justify-center rounded-full font-bold text-white"
                  style={{ width: 40, height: 40, background: conv.avatarColor, fontSize: 13 }}
                >
                  {conv.avatar}
                </div>
                {conv.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-indigo-500 font-bold text-white" style={{ height: 16, minWidth: 16, padding: '0 4px', fontSize: 10, border: '2px solid #0a0f1c' }}>
                    {conv.unread}
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }} className="truncate">{conv.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-400)' }} className="flex-shrink-0 ml-2">{conv.lastTime}</span>
                </div>
                <div className="flex items-center gap-2" style={{ marginBottom: 5 }}>
                  <Badge variant={STATUS_CONFIG[conv.status].variant}>
                    {STATUS_CONFIG[conv.status].label}
                  </Badge>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{conv.city}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.45 }} className="truncate">{conv.lastPreview}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center: Thread + Composer */}
      <div className={cn(
        'flex flex-1 flex-col overflow-hidden',
        mobilePanel !== 'thread' ? 'hidden md:flex' : 'flex'
      )}>
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
            <div className="flex items-center justify-between border-b border-[#1e2a3a] bg-[#0a0f1c]" style={{ padding: '14px 24px' }}>
              <div className="flex items-center gap-3.5">
                <div
                  className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
                  style={{ width: 40, height: 40, fontSize: 13, background: selected.avatarColor }}
                >
                  {selected.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>{selected.name}</span>
                    <Badge variant={STATUS_CONFIG[selected.status].variant}>
                      {STATUS_CONFIG[selected.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{selected.city}</span>
                    <span style={{ color: 'var(--ink-300)' }}>·</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)' }} className="capitalize">{selected.source}</span>
                    <span style={{ color: 'var(--ink-300)' }}>·</span>
                    <span
                      style={{ fontSize: 12, fontWeight: 600 }}
                      className={cn(
                        selected.aiScore >= 80 ? 'text-emerald-400' : selected.aiScore >= 50 ? 'text-amber-400' : 'text-slate-500'
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
                  <MoreVertical className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto space-y-4" style={{ padding: '20px 24px' }}>
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
                      className="flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white"
                      style={{ width: 30, height: 30, marginTop: 2, fontSize: 11, background: selected.avatarColor }}
                    >
                      {selected.avatar}
                    </div>
                  )}
                  <div className={cn('max-w-[72%]', msg.from === 'us' ? 'items-end' : 'items-start', 'flex flex-col gap-1.5')}>
                    <div
                      className={cn(
                        'rounded-2xl',
                        msg.from === 'us'
                          ? 'bg-indigo-500 text-white rounded-tr-sm'
                          : 'bg-[#1a2537] text-slate-100 rounded-tl-sm'
                      )}
                      style={{ padding: '10px 14px', fontSize: 13.5, lineHeight: 1.55 }}
                    >
                      {msg.text}
                    </div>
                    <div
                      className={cn('flex items-center gap-1.5', msg.from === 'us' ? 'flex-row-reverse' : '')}
                      style={{ fontSize: 11, color: 'var(--ink-400)' }}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{msg.time}</span>
                      {msg.from === 'us' && <CheckCheck className="h-3 w-3 text-indigo-400" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI Insight bar */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5" style={{ margin: '0 24px 14px', padding: '12px 16px' }}>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
                  <Bot className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2" style={{ marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-400)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI Insight</span>
                    {selected.aiScore >= 80 && <Flame className="h-3.5 w-3.5 text-orange-400" />}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }}>{selected.aiInsight}</p>
                </div>
                <Button
                  variant="glow"
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
            <div style={{ padding: '0 24px 18px' }}>
              <div className="relative rounded-xl border border-[#1e2a3a] bg-[#111827] focus-within:border-indigo-500/40 transition-colors">
                <textarea
                  className="w-full resize-none rounded-xl bg-transparent focus:outline-none"
                  style={{ padding: '14px 16px 50px', fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.55 }}
                  rows={3}
                  placeholder="Type a message or click AI Draft…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
                  }}
                />
                <div className="absolute flex items-center gap-3" style={{ bottom: 10, right: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>⌘+Enter to send</span>
                  <Button onClick={handleSend} disabled={!draft.trim()} size="sm">
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right sidebar: Lead scoring */}
      <div className={cn(
        'flex-shrink-0 border-[#1e2a3a] bg-[#0a0f1c] space-y-5',
        'w-full md:w-64 md:border-l',
        mobilePanel !== 'details' ? 'hidden md:block' : 'block overflow-y-auto'
      )}
        style={{ padding: 18 }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>AI Lead Score</p>
          <div className="text-center" style={{ padding: '14px 0 10px' }}>
            <div
              className={cn(
                'tnum',
                selected.aiScore >= 80 ? 'text-emerald-400' : selected.aiScore >= 50 ? 'text-amber-400' : 'text-slate-500'
              )}
              style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              {selected.aiScore}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 4 }}>out of 100</div>
            <div className="rounded-full bg-[#1a2537] overflow-hidden" style={{ marginTop: 12, height: 6 }}>
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  selected.aiScore >= 80 ? 'bg-emerald-500' : selected.aiScore >= 50 ? 'bg-amber-500' : 'bg-slate-500'
                )}
                style={{ width: `${selected.aiScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#1e2a3a]" style={{ paddingTop: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>Details</p>
          <div className="space-y-2.5">
            {[
              ['Source', selected.source],
              ['Location', selected.city],
              ['Messages', String(currentThread.length)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center">
                <span style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{label}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-700)', fontWeight: 500 }} className="capitalize">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>Stage</span>
              <Badge variant={STATUS_CONFIG[selected.status].variant}>
                {STATUS_CONFIG[selected.status].label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-[#1e2a3a]" style={{ paddingTop: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>Quick Actions</p>
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

        <div className="border-t border-[#1e2a3a]" style={{ paddingTop: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>Pipeline Today</p>
          <div className="space-y-2">
            {['new-lead', 'quote-sent', 'booked'].map(s => {
              const count = CONVERSATIONS.filter(c => c.status === s).length
              return (
                <div key={s} className="flex justify-between items-center">
                  <span style={{ fontSize: 12.5, color: 'var(--ink-400)' }} className="capitalize">{s.replace('-', ' ')}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }} className="tnum">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
