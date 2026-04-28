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
    id: 'm1', name: 'Patricia Nguyen', avatar: 'PN', avatarColor: '#5EEAD4',
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

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  'new-lead': { label: 'New Lead', variant: 'default' },
  'quote-sent': { label: 'Quote Sent', variant: 'warning' },
  'booked': { label: 'Booked', variant: 'success' },
  'info-request': { label: 'Info Request', variant: 'default' },
  'lost': { label: 'Lost', variant: 'neutral' },
  'referral': { label: 'Referral', variant: 'default' },
}

export function InboxClient() {
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
          {/* Header */}
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
              <input
                className="w-full rounded-[8px] bg-soft border border-line focus:outline-none focus:border-mint-500/40 py-[9px] pl-9 pr-3 text-[12.5px] text-ink-700 placeholder:text-ink-400"
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mt-3">
              {['all', 'new-lead', 'booked', 'quote-sent'].map(f => (
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
                  'w-full flex items-start gap-3 text-left transition-colors border-b border-line px-4 py-3.5',
                  selected.id === conv.id ? 'bg-mint-500/[0.06]' : 'hover:bg-soft',
                )}
              >
                {/* Avatar */}
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
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-ink-900 truncate">{conv.name}</span>
                    <span className="text-[11px] text-ink-400 flex-shrink-0 ml-2">{conv.lastTime}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-[5px]">
                    <Badge variant={STATUS_CONFIG[conv.status].variant}>
                      {STATUS_CONFIG[conv.status].label}
                    </Badge>
                    <span className="text-[11.5px] text-ink-400">{conv.city}</span>
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
                      <span className="text-[12px] text-ink-500">{selected.city}</span>
                      <span className="text-ink-400">·</span>
                      <span className="text-[12px] text-ink-500 capitalize">{selected.source}</span>
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
        </div>

        {/* Right sidebar: Lead scoring */}
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
                ['Source', selected.source],
                ['Location', selected.city],
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
              {['new-lead', 'quote-sent', 'booked'].map(s => {
                const count = CONVERSATIONS.filter(c => c.status === s).length
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
      </div>
    </div>
  )
}
