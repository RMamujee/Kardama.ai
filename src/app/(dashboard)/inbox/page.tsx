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

function generateDraft(conv: Conversation): string {
  const last = conv.thread[conv.thread.length - 1].text.toLowerCase()
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
      setDraft(generateDraft(selected))
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
        'w-full md:w-80 md:border-r',
        mobilePanel !== 'list' ? 'hidden md:flex' : 'flex'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-[#1e2a3a]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">AI Inbox</h2>
              {totalUnread > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20">
              <Zap className="h-2.5 w-2.5 text-indigo-400" />
              <span className="text-[10px] font-medium text-indigo-400">AI Active</span>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              className="w-full rounded-lg bg-[#0d1321] border border-[#1e2a3a] pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Filter tabs */}
          <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            {['all', 'new-lead', 'booked', 'quote-sent'].map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={cn(
                  'flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                  filterStatus === f
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                )}
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
                'w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-[#1e2a3a]/50',
                selected.id === conv.id ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: conv.avatarColor }}
                >
                  {conv.avatar}
                </div>
                {conv.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white">
                    {conv.unread}
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-slate-200 truncate">{conv.name}</span>
                  <span className="text-[10px] text-slate-600 flex-shrink-0 ml-1">{conv.lastTime}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant={STATUS_CONFIG[conv.status].variant} className="text-[9px] px-1.5 py-0">
                    {STATUS_CONFIG[conv.status].label}
                  </Badge>
                  <span className="text-[10px] text-slate-600">{conv.city}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{conv.lastPreview}</p>
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
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e2a3a] bg-[#0a0f1c]">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                  style={{ background: selected.avatarColor }}
                >
                  {selected.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{selected.name}</span>
                    <Badge variant={STATUS_CONFIG[selected.status].variant} className="text-[9px]">
                      {STATUS_CONFIG[selected.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500">{selected.city}</span>
                    <span className="text-[11px] text-slate-600">·</span>
                    <span className="text-[11px] text-slate-500 capitalize">{selected.source}</span>
                    <span className="text-[11px] text-slate-600">·</span>
                    <span className={cn(
                      'text-[11px] font-medium',
                      selected.aiScore >= 80 ? 'text-emerald-400' : selected.aiScore >= 50 ? 'text-amber-400' : 'text-slate-500'
                    )}>
                      AI Score: {selected.aiScore}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {currentThread.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn('flex gap-2', msg.from === 'us' ? 'justify-end' : 'justify-start')}
                >
                  {msg.from === 'them' && (
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
                      style={{ background: selected.avatarColor }}
                    >
                      {selected.avatar}
                    </div>
                  )}
                  <div className={cn('max-w-[70%]', msg.from === 'us' ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
                    <div className={cn(
                      'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      msg.from === 'us'
                        ? 'bg-indigo-500 text-white rounded-tr-sm'
                        : 'bg-[#1a2537] text-slate-200 rounded-tl-sm'
                    )}>
                      {msg.text}
                    </div>
                    <div className={cn('flex items-center gap-1 text-[10px] text-slate-600', msg.from === 'us' ? 'flex-row-reverse' : '')}>
                      <Clock className="h-2.5 w-2.5" />
                      <span>{msg.time}</span>
                      {msg.from === 'us' && <CheckCheck className="h-2.5 w-2.5 text-indigo-400 ml-0.5" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI Insight bar */}
            <div className="mx-6 mb-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5">
              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
                  <Bot className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">AI Insight</span>
                    {selected.aiScore >= 80 && <Flame className="h-3 w-3 text-orange-400" />}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{selected.aiInsight}</p>
                </div>
                <Button
                  variant="glow"
                  size="sm"
                  className="flex-shrink-0 h-7 text-xs"
                  onClick={handleAiDraft}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {aiGenerating ? 'Drafting...' : 'AI Draft'}
                </Button>
              </div>
            </div>

            {/* Composer */}
            <div className="px-6 pb-4">
              <div className="relative rounded-xl border border-[#1e2a3a] bg-[#111827] focus-within:border-indigo-500/40 transition-colors">
                <textarea
                  className="w-full resize-none rounded-xl bg-transparent px-4 pt-3 pb-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  rows={3}
                  placeholder="Type a message or click AI Draft..."
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
                  }}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="text-[10px] text-slate-600">⌘+Enter to send</span>
                  <Button
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    size="sm"
                    className="h-7 gap-1.5"
                  >
                    <Send className="h-3 w-3" />
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
        'flex-shrink-0 border-[#1e2a3a] bg-[#0a0f1c] p-4 space-y-4',
        'w-full md:w-56 md:border-l',
        mobilePanel !== 'details' ? 'hidden md:block' : 'block overflow-y-auto'
      )}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">AI Lead Score</p>
          <div className="text-center py-3">
            <div className={cn(
              'text-4xl font-bold',
              selected.aiScore >= 80 ? 'text-emerald-400' : selected.aiScore >= 50 ? 'text-amber-400' : 'text-slate-500'
            )}>
              {selected.aiScore}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">out of 100</div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#1a2537] overflow-hidden">
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

        <div className="border-t border-[#1e2a3a] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Details</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Source</span>
              <span className="text-[11px] text-slate-300 capitalize">{selected.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Location</span>
              <span className="text-[11px] text-slate-300">{selected.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Messages</span>
              <span className="text-[11px] text-slate-300">{currentThread.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Stage</span>
              <Badge variant={STATUS_CONFIG[selected.status].variant} className="text-[9px] px-1.5">
                {STATUS_CONFIG[selected.status].label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-[#1e2a3a] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Quick Actions</p>
          <div className="space-y-1.5">
            <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start gap-2">
              <Tag className="h-3 w-3" />
              Add Label
            </Button>
            <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start gap-2">
              <Star className="h-3 w-3" />
              Mark Priority
            </Button>
            <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start gap-2">
              <ArrowRight className="h-3 w-3" />
              Book Job
            </Button>
          </div>
        </div>

        <div className="border-t border-[#1e2a3a] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Pipeline Today</p>
          <div className="space-y-1.5">
            {['new-lead', 'quote-sent', 'booked'].map(s => {
              const count = CONVERSATIONS.filter(c => c.status === s).length
              return (
                <div key={s} className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 capitalize">{s.replace('-', ' ')}</span>
                  <span className="text-[11px] font-semibold text-slate-300">{count}</span>
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
