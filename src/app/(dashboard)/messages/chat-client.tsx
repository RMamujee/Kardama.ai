'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cleaner } from '@/types'
import type { Message } from '@/lib/data'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { sendOwnerMessage, markCleanerMessagesRead } from './actions'
import { useChatStore } from '@/store/useChatStore'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (d.toDateString() === now.toDateString()) return formatTime(iso)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Use inline styles for bubble radius — avoids Tailwind JIT purging dynamic classes
function bubbleRadius(isOwner: boolean, isFirst: boolean, isLast: boolean): React.CSSProperties {
  const full = 18
  const nub = 4
  if (isOwner) {
    return { borderRadius: `${full}px ${isFirst ? nub : full}px ${isLast ? nub : full}px ${full}px` }
  }
  return { borderRadius: `${isFirst ? nub : full}px ${full}px ${full}px ${isLast ? nub : full}px` }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ConversationSummary = {
  cleanerId: string
  lastContent: string | null
  lastSenderRole: 'owner' | 'cleaner' | null
  lastAt: string | null
}

// ── Sidebar cleaner row ───────────────────────────────────────────────────────

function CleanerRow({
  cleaner,
  summary,
  unread,
  selected,
  onClick,
}: {
  cleaner: Cleaner
  summary: ConversationSummary
  unread: number
  selected: boolean
  onClick: () => void
}) {
  const preview = summary.lastContent
    ? (summary.lastSenderRole === 'owner' ? 'You: ' : '') +
      summary.lastContent.slice(0, 38) +
      (summary.lastContent.length > 38 ? '…' : '')
    : 'No messages yet'

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors',
        selected ? 'bg-mint-500/10' : 'hover:bg-hover',
      )}
    >
      {/* Active indicator */}
      {selected && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-mint-500" />
      )}

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-black"
        style={{ backgroundColor: cleaner.color }}
      >
        {cleaner.initials}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={cn(
            'text-[13px] font-semibold leading-none truncate',
            selected ? 'text-mint-500' : unread > 0 ? 'text-ink-900' : 'text-ink-700',
          )}>
            {cleaner.name}
          </span>
          <span className="text-[10px] text-ink-400 shrink-0">{relativeTime(summary.lastAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-1.5">
          <span className={cn(
            'text-[11.5px] truncate leading-none',
            unread > 0 ? 'text-ink-600 font-medium' : 'text-ink-400',
          )}>
            {preview}
          </span>
          {unread > 0 && (
            <span className="shrink-0 min-w-[16px] h-4 rounded-full bg-mint-500 flex items-center justify-center text-[9.5px] font-bold text-black px-1 leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ m, isOwner, isFirst, isLast }: {
  m: Message; isOwner: boolean; isFirst: boolean; isLast: boolean
}) {
  const radius = bubbleRadius(isOwner, isFirst, isLast)

  return (
    <div
      className={cn('max-w-[68%] px-3.5 py-2', isOwner ? 'bg-mint-500 text-black' : 'bg-card border border-line-strong text-ink-700')}
      style={radius}
    >
      <p className="text-[13px] leading-[1.55] whitespace-pre-wrap break-words">{m.content}</p>
    </div>
  )
}

// ── Thread ────────────────────────────────────────────────────────────────────

function Thread({ cleaner, messages }: { cleaner: Cleaner; messages: Message[] }) {
  const groups: { date: string; msgs: Message[] }[] = []
  for (const m of messages) {
    const label = formatDate(m.createdAt)
    const last = groups[groups.length - 1]
    if (last?.date === label) last.msgs.push(m)
    else groups.push({ date: label, msgs: [m] })
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-[20px] font-bold text-black"
          style={{ backgroundColor: cleaner.color }}
        >
          {cleaner.initials}
        </div>
        <p className="text-[14px] font-semibold text-ink-700">
          {cleaner.name}
        </p>
        <p className="text-[12px] text-ink-500 mt-1 max-w-[200px] leading-relaxed">
          Send a message to start the conversation
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-1">
      {groups.map(group => (
        <div key={group.date}>
          {/* Date divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[10.5px] font-semibold text-ink-400 uppercase tracking-[0.08em]">
              {group.date}
            </span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Message cluster */}
          <div className="space-y-[3px]">
            {group.msgs.map((m, idx) => {
              const isOwner = m.senderRole === 'owner'
              const prevSame = idx > 0 && group.msgs[idx - 1].senderRole === m.senderRole
              const nextSame = idx < group.msgs.length - 1 && group.msgs[idx + 1].senderRole === m.senderRole
              const isFirst = !prevSame
              const isLast = !nextSame

              return (
                <div key={m.id}>
                  {/* Sender name — first bubble in a cleaner group */}
                  {isFirst && !isOwner && (
                    <div className="flex items-center gap-1.5 mb-1 mt-2">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-black"
                        style={{ backgroundColor: cleaner.color }}
                      />
                      <span className="text-[11px] font-semibold text-ink-500">{cleaner.name}</span>
                    </div>
                  )}

                  <div className={cn('flex', isOwner ? 'justify-end' : 'justify-start', isFirst && !isOwner ? '' : !isOwner ? 'ml-5.5' : '')}>
                    <Bubble m={m} isOwner={isOwner} isFirst={isFirst} isLast={isLast} />
                  </div>

                  {/* Timestamp — only after the last bubble in a group */}
                  {isLast && (
                    <div className={cn('flex mt-0.5 mb-1', isOwner ? 'justify-end mr-1' : 'justify-start ml-6')}>
                      <span className="text-[10.5px] text-ink-400">{formatTime(m.createdAt)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatClient({
  cleaners,
  initialMessages,
}: {
  cleaners: Cleaner[]
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedId, setSelectedId] = useState<string | null>(cleaners[0]?.id ?? null)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { unreadMap, clearUnread, incrementUnread } = useChatStore()
  const selectedCleaner = cleaners.find(c => c.id === selectedId) ?? null

  const summaryMap = useMemo<Record<string, ConversationSummary>>(() => {
    const map: Record<string, ConversationSummary> = {}
    for (const m of messages) {
      const ex = map[m.cleanerId]
      if (!ex || m.createdAt > ex.lastAt!) {
        map[m.cleanerId] = { cleanerId: m.cleanerId, lastContent: m.content, lastSenderRole: m.senderRole, lastAt: m.createdAt }
      }
    }
    return map
  }, [messages])

  const sortedCleaners = useMemo(() => [...cleaners].sort((a, b) => {
    const aAt = summaryMap[a.id]?.lastAt ?? ''
    const bAt = summaryMap[b.id]?.lastAt ?? ''
    if (aAt || bAt) return bAt.localeCompare(aAt)
    return a.name.localeCompare(b.name)
  }), [cleaners, summaryMap])

  const threadMessages = useMemo(
    () => messages.filter(m => m.cleanerId === selectedId),
    [messages, selectedId],
  )

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages.length])

  // Mark read when opening a conversation
  useEffect(() => {
    if (!selectedId) return
    clearUnread(selectedId)
    markCleanerMessagesRead(selectedId).catch(() => {})
  }, [selectedId, clearUnread])

  // Global realtime subscription
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const ch = supabase
      .channel('dashboard-chat-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const r = payload.new as {
          id: string; cleaner_id: string; sender_role: string
          content: string; read_at: string | null; created_at: string
        }
        setMessages(prev => [...prev, {
          id: r.id, cleanerId: r.cleaner_id,
          senderRole: r.sender_role as 'owner' | 'cleaner',
          content: r.content, readAt: r.read_at, createdAt: r.created_at,
        }])
        if (r.sender_role === 'cleaner' && r.cleaner_id !== selectedId) {
          incrementUnread(r.cleaner_id)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selectedId, incrementUnread])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isPending || !selectedId) return
    setText('')
    startTransition(async () => { await sendOwnerMessage(selectedId, trimmed) })
  }

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden bg-page">

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r border-line bg-rail overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-mint-500 shrink-0" />
            <span className="text-[12px] font-semibold text-ink-500 uppercase tracking-[0.06em]">
              Direct Messages
            </span>
          </div>
        </div>

        {/* Cleaner list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-px">
          {sortedCleaners.map(cleaner => (
            <CleanerRow
              key={cleaner.id}
              cleaner={cleaner}
              summary={summaryMap[cleaner.id] ?? { cleanerId: cleaner.id, lastContent: null, lastSenderRole: null, lastAt: null }}
              unread={unreadMap[cleaner.id] ?? 0}
              selected={selectedId === cleaner.id}
              onClick={() => { setSelectedId(cleaner.id); setText('') }}
            />
          ))}
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────────────────── */}
      {selectedCleaner ? (
        <div className="flex flex-col flex-1 min-w-0 bg-page">

          {/* Top bar */}
          <div className="shrink-0 flex items-center gap-3 px-6 h-14 border-b border-line bg-rail">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-black shrink-0"
              style={{ backgroundColor: selectedCleaner.color }}
            >
              {selectedCleaner.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-ink-900 leading-none">
                  {selectedCleaner.name}
                </span>
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  selectedCleaner.status === 'available' ? 'bg-mint-500' : 'bg-ink-400',
                )} />
                <span className="text-[11px] text-ink-400 capitalize">{selectedCleaner.status}</span>
              </div>
            </div>
          </div>

          {/* Thread */}
          <div className="flex-1 overflow-y-auto">
            <Thread cleaner={selectedCleaner} messages={threadMessages} />
            <div ref={bottomRef} className="h-2" />
          </div>

          {/* Input */}
          <div className="shrink-0 px-6 py-4 border-t border-line bg-rail">
            <div className="flex items-end gap-3 bg-soft border border-line-strong rounded-xl px-4 py-3 focus-within:border-mint-500/40 transition-colors">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder={`Message ${selectedCleaner.name.split(' ')[0]}…`}
                rows={1}
                className="flex-1 resize-none bg-transparent text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none leading-[1.55] overflow-hidden"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || isPending}
                className="w-8 h-8 rounded-lg bg-mint-500 flex items-center justify-center shrink-0 transition-all hover:bg-mint-400 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <Send size={13} className="text-black translate-x-px" />
              </button>
            </div>
            <p className="text-[10.5px] text-ink-400 mt-2 ml-1">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center flex-col gap-3 text-center bg-page">
          <MessageSquare className="h-10 w-10 text-ink-300" />
          <p className="text-[13px] text-ink-500">Select a conversation</p>
        </div>
      )}
    </div>
  )
}
