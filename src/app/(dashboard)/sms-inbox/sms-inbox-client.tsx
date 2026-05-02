'use client'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Bot, User, AlertTriangle, MessageSquare, Phone,
  Search, Inbox, RefreshCw, Sparkles, CheckCheck, Hand,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  takeOverConversation, handBackToAi, sendOwnerReply, markConversationRead,
} from './actions'

export type ConversationSummary = {
  id: string
  customerPhone: string
  customerId: string | null
  customerName: string | null
  customerAddress: string | null
  customerCity: string | null
  customerTotalSpent: number
  mode: 'auto' | 'human' | 'escalated'
  escalationReason: string | null
  lastMessageAt: string
  unreadCount: number
  lastMessagePreview: string
}

type Message = {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  sender: 'customer' | 'ai' | 'owner'
  body: string
  aiToolsUsed: unknown
  createdAt: string
}

const MODE_BADGE: Record<ConversationSummary['mode'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'neutral'; icon: typeof Bot }> = {
  auto:       { label: 'AI', variant: 'success', icon: Bot },
  human:      { label: 'You', variant: 'warning', icon: User },
  escalated:  { label: 'Escalated', variant: 'danger', icon: AlertTriangle },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function shortPhone(e164: string): string {
  const d = e164.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  }
  return e164
}

export function SmsInboxClient({ initialConversations }: { initialConversations: ConversationSummary[] }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'escalated' | 'unread'>('all')
  const [pending, startTransition] = useTransition()
  const [sending, setSending] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  )

  // Load messages whenever the selection changes.
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    let cancelled = false
    const load = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from('sms_messages')
        .select('id, conversation_id, direction, sender, body, ai_tools_used, created_at')
        .eq('conversation_id', selectedId)
        .order('created_at', { ascending: true })
      if (cancelled) return
      setMessages(((data ?? []) as Array<{
        id: string; conversation_id: string; direction: 'inbound' | 'outbound'
        sender: 'customer' | 'ai' | 'owner'; body: string; ai_tools_used: unknown; created_at: string
      }>).map((m) => ({
        id: m.id, conversationId: m.conversation_id, direction: m.direction,
        sender: m.sender, body: m.body, aiToolsUsed: m.ai_tools_used, createdAt: m.created_at,
      })))
    }
    load()

    // Mark read in the background.
    markConversationRead(selectedId).catch(() => {})
    setConversations((prev) => prev.map((c) => c.id === selectedId ? { ...c, unreadCount: 0 } : c))

    return () => { cancelled = true }
  }, [selectedId])

  // Realtime: new messages append, conversations bump to top + update mode/unread.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const msgChannel = supabase.channel('sms-messages-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sms_messages' },
        (payload) => {
          const r = payload.new as {
            id: string; conversation_id: string; direction: 'inbound' | 'outbound'
            sender: 'customer' | 'ai' | 'owner'; body: string; ai_tools_used: unknown; created_at: string
          }
          // If this is for the open thread, append it
          if (r.conversation_id === selectedId) {
            setMessages((prev) => prev.some((m) => m.id === r.id) ? prev : [...prev, {
              id: r.id, conversationId: r.conversation_id, direction: r.direction,
              sender: r.sender, body: r.body, aiToolsUsed: r.ai_tools_used, createdAt: r.created_at,
            }])
          }
          // Update preview + bump in conversation list
          setConversations((prev) => {
            const next = prev.map((c) => c.id === r.conversation_id ? {
              ...c,
              lastMessagePreview: r.body,
              lastMessageAt: r.created_at,
              unreadCount: r.direction === 'inbound' && r.conversation_id !== selectedId
                ? c.unreadCount + 1 : c.unreadCount,
            } : c)
            return next.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
          })
        },
      )
      .subscribe()

    const convChannel = supabase.channel('sms-conversations-stream')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sms_conversations' },
        (payload) => {
          const r = payload.new as {
            id: string; mode: 'auto' | 'human' | 'escalated'
            escalation_reason: string | null; unread_count: number
          }
          setConversations((prev) => prev.map((c) => c.id === r.id ? {
            ...c, mode: r.mode, escalationReason: r.escalation_reason, unreadCount: r.unread_count,
          } : c))
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sms_conversations' },
        (payload) => {
          const r = payload.new as {
            id: string; customer_phone: string; customer_id: string | null
            mode: 'auto' | 'human' | 'escalated'; escalation_reason: string | null
            last_message_at: string; unread_count: number
          }
          setConversations((prev) => prev.some((c) => c.id === r.id) ? prev : [{
            id: r.id, customerPhone: r.customer_phone, customerId: r.customer_id,
            customerName: null, customerAddress: null, customerCity: null, customerTotalSpent: 0,
            mode: r.mode, escalationReason: r.escalation_reason,
            lastMessageAt: r.last_message_at, unreadCount: r.unread_count,
            lastMessagePreview: '',
          }, ...prev])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(convChannel)
    }
  }, [selectedId])

  // Scroll to bottom on new messages.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === 'escalated' && c.mode !== 'escalated') return false
      if (filter === 'unread' && c.unreadCount === 0) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(c.customerName?.toLowerCase().includes(q) || c.customerPhone.includes(q))) return false
      }
      return true
    })
  }, [conversations, filter, search])

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0)
  const escalatedCount = conversations.filter((c) => c.mode === 'escalated').length

  const onSend = async () => {
    if (!selected || !draft.trim()) return
    setSending(true)
    try {
      await sendOwnerReply(selected.id, draft)
      setDraft('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const onTakeOver = () => {
    if (!selected) return
    startTransition(async () => {
      try { await takeOverConversation(selected.id) } catch (err) { console.error(err) }
    })
  }

  const onHandBack = () => {
    if (!selected) return
    startTransition(async () => {
      try { await handBackToAi(selected.id) } catch (err) { console.error(err) }
    })
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center h-[calc(100vh-60px)]">
        <Inbox className="h-12 w-12 text-ink-300" />
        <div>
          <p className="text-[14px] font-semibold text-ink-700">No SMS conversations yet</p>
          <p className="text-[13px] text-ink-400 mt-1 max-w-sm">
            Inbound texts to your business number show up here. The AI agent replies automatically; take over any thread anytime.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden">
      {/* Left: Conversation list */}
      <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-line bg-rail">
        <div className="border-b border-line p-[18px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-[16px] w-[16px] text-mint-500" />
              <h2 className="text-[15px] font-semibold text-ink-900 tracking-[-0.01em]">SMS Inbox</h2>
              {totalUnread > 0 && (
                <span className="num flex items-center justify-center rounded-full bg-mint-500 font-semibold text-page h-[18px] min-w-[18px] px-[5px] text-[10.5px]">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-mint-500/12 px-2 py-1 text-[10.5px] font-semibold text-mint-500">
              <Sparkles className="h-3 w-3" /> AI On
            </div>
          </div>
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
            <input
              className="w-full rounded-[8px] bg-soft border border-line focus:outline-none focus:border-mint-500/40 py-[9px] pl-9 pr-3 text-[12.5px] text-ink-700 placeholder:text-ink-400"
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'unread', 'escalated'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-shrink-0 rounded-[6px] font-medium transition-colors px-2.5 py-[5px] text-[12px]',
                  filter === f
                    ? 'bg-mint-500/12 text-mint-500'
                    : 'text-ink-500 hover:text-ink-700 hover:bg-soft',
                )}
              >
                {f === 'all' ? 'All' : f === 'unread' ? `Unread${totalUnread ? ` (${totalUnread})` : ''}` : `Escalated${escalatedCount ? ` (${escalatedCount})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[13px] text-ink-400">No conversations match</p>
            </div>
          ) : filtered.map((c) => {
            const ModeIcon = MODE_BADGE[c.mode].icon
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'w-full flex items-start gap-3 text-left transition-colors border-b border-line px-4 py-3.5',
                  selectedId === c.id ? 'bg-mint-500/[0.06]' : 'hover:bg-soft',
                )}
              >
                <div className={cn(
                  'mt-0.5 flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full font-semibold text-page text-[12px]',
                  c.mode === 'escalated' ? 'bg-rose-500' : c.mode === 'human' ? 'bg-amber-500' : 'bg-mint-500',
                )}>
                  <ModeIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-ink-900 truncate">
                      {c.customerName ?? shortPhone(c.customerPhone)}
                    </span>
                    <span className="text-[11px] text-ink-400 flex-shrink-0 ml-2">
                      {relativeTime(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={MODE_BADGE[c.mode].variant}>{MODE_BADGE[c.mode].label}</Badge>
                    {c.unreadCount > 0 && (
                      <span className="num text-[10.5px] font-semibold rounded-full bg-mint-500 text-page px-[6px] py-[1px]">
                        {c.unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-ink-500 leading-[1.45] truncate">
                    {c.lastMessagePreview || '(no messages yet)'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Center: Thread + composer */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              {/* Thread header */}
              <div className="flex items-center justify-between border-b border-line bg-rail px-6 py-3.5">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-page',
                    selected.mode === 'escalated' ? 'bg-rose-500' : selected.mode === 'human' ? 'bg-amber-500' : 'bg-mint-500',
                  )}>
                    {selected.customerName ? selected.customerName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : <Phone className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[14px] font-semibold text-ink-900 tracking-[-0.01em] truncate">
                        {selected.customerName ?? shortPhone(selected.customerPhone)}
                      </span>
                      <Badge variant={MODE_BADGE[selected.mode].variant}>
                        {MODE_BADGE[selected.mode].label}
                      </Badge>
                    </div>
                    <div className="num text-[12px] text-ink-500 mt-0.5">
                      {shortPhone(selected.customerPhone)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selected.mode === 'auto' ? (
                    <Button variant="outline" size="sm" onClick={onTakeOver} disabled={pending}>
                      <Hand className="h-3.5 w-3.5" />
                      Take over
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={onHandBack} disabled={pending}>
                      <Bot className="h-3.5 w-3.5" />
                      Hand back to AI
                    </Button>
                  )}
                </div>
              </div>

              {selected.mode === 'escalated' && selected.escalationReason && (
                <div className="px-6 py-2.5 border-b border-line bg-rose-500/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-ink-700 leading-[1.5]">
                      <span className="font-semibold text-rose-500">AI escalated this thread:</span>{' '}
                      {selected.escalationReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-8 w-8 text-ink-300 mb-2" />
                    <p className="text-[13px] text-ink-400">No messages yet</p>
                  </div>
                )}
                {messages.map((m) => (
                  <MessageBubble key={m.id} m={m} />
                ))}
              </div>

              {/* Composer */}
              <div className="px-6 pb-[18px]">
                <div className="relative rounded-[10px] border border-line bg-card focus-within:border-mint-500/40 transition-colors">
                  <textarea
                    className="w-full resize-none rounded-[10px] bg-transparent focus:outline-none px-4 pt-3.5 pb-[50px] text-[13px] text-ink-700 leading-[1.55]"
                    rows={3}
                    placeholder={
                      selected.mode === 'auto'
                        ? 'Reply manually — sending will take over this thread'
                        : 'Type a reply…'
                    }
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend()
                    }}
                  />
                  <div className="absolute flex items-center gap-3 bottom-2.5 right-3">
                    <span className="text-[11px] text-ink-400">⌘+Enter to send</span>
                    <Button onClick={onSend} disabled={!draft.trim() || sending} size="sm">
                      {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
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

      {/* Right: customer + AI audit panel */}
      {selected && (
        <div className="flex-shrink-0 border-l border-line bg-rail p-[18px] w-72 overflow-y-auto">
          <p className="text-[12px] font-medium text-ink-500 mb-2.5">Customer</p>
          {selected.customerId ? (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-ink-900">{selected.customerName}</p>
              {selected.customerAddress && (
                <p className="text-[12px] text-ink-500 leading-[1.5]">
                  {selected.customerAddress}
                  {selected.customerCity ? `, ${selected.customerCity}` : ''}
                </p>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-line">
                <span className="text-[11.5px] text-ink-400">Total spend</span>
                <span className="num text-[12.5px] font-semibold text-emerald-500">
                  ${selected.customerTotalSpent.toFixed(0)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-ink-400">Cold inbound — not yet a customer.</p>
          )}

          <div className="border-t border-line my-4" />
          <p className="text-[12px] font-medium text-ink-500 mb-2.5">Recent AI actions</p>
          <RecentToolCalls messages={messages} />
        </div>
      )}
    </div>
  )
}

function MessageBubble({ m }: { m: Message }) {
  const isOutbound = m.direction === 'outbound'
  const senderLabel = m.sender === 'ai' ? 'AI' : m.sender === 'owner' ? 'You' : ''
  const tools = Array.isArray(m.aiToolsUsed) ? m.aiToolsUsed as Array<{ name: string }> : null

  return (
    <div className={cn('flex gap-2.5', isOutbound ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[72%] flex flex-col gap-1', isOutbound ? 'items-end' : 'items-start')}>
        {senderLabel && (
          <div className="flex items-center gap-1 text-[11px] text-ink-400 font-medium">
            {m.sender === 'ai' ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {senderLabel}
          </div>
        )}
        <div
          className={cn(
            'rounded-[14px] px-3.5 py-2.5 text-[13px] leading-[1.55]',
            isOutbound
              ? m.sender === 'ai'
                ? 'bg-gradient-to-b from-mint-400 to-mint-600 text-page rounded-tr-sm'
                : 'bg-amber-500 text-page rounded-tr-sm'
              : 'bg-elev text-ink-900 rounded-tl-sm border border-line',
          )}
        >
          {m.body}
        </div>
        {tools && tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {tools.map((t, i) => (
              <span key={i} className="text-[10.5px] text-ink-400 font-mono bg-soft border border-line rounded px-1.5 py-0.5">
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 text-[11px] text-ink-400">
          <span>{relativeTime(m.createdAt)} ago</span>
          {isOutbound && <CheckCheck className="h-3 w-3 text-mint-500" />}
        </div>
      </div>
    </div>
  )
}

function RecentToolCalls({ messages }: { messages: Message[] }) {
  const recent = messages
    .filter((m) => Array.isArray(m.aiToolsUsed) && (m.aiToolsUsed as unknown[]).length > 0)
    .slice(-5)
    .reverse()
  if (recent.length === 0) {
    return <p className="text-[12px] text-ink-400">No tool calls in this thread yet.</p>
  }
  return (
    <div className="space-y-2">
      {recent.flatMap((m) => {
        const tools = m.aiToolsUsed as Array<{ name: string; result?: { ok?: boolean } }>
        return tools.map((t, i) => (
          <div key={`${m.id}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-soft border border-line px-2.5 py-1.5">
            <span className="text-[11.5px] font-mono text-ink-700 truncate">{t.name}</span>
            <span className={cn(
              'text-[10.5px] font-semibold rounded px-1.5 py-0.5',
              t.result?.ok ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10',
            )}>
              {t.result?.ok ? 'ok' : 'fail'}
            </span>
          </div>
        ))
      })}
    </div>
  )
}
