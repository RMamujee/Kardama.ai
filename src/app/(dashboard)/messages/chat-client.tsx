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

// ── Types ─────────────────────────────────────────────────────────────────────

type ConversationSummary = {
  cleanerId: string
  lastContent: string | null
  lastSenderRole: 'owner' | 'cleaner' | null
  lastAt: string | null
}

// ── Cleaner sidebar row ───────────────────────────────────────────────────────

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
      summary.lastContent.slice(0, 42) +
      (summary.lastContent.length > 42 ? '…' : '')
    : 'No messages yet'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        selected ? 'bg-mint/10' : 'hover:bg-hover',
      )}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold text-black"
        style={{ backgroundColor: cleaner.color }}
      >
        {cleaner.initials}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn(
            'text-[13px] font-semibold truncate',
            selected ? 'text-mint' : 'text-ink-900',
          )}>
            {cleaner.name}
          </span>
          <span className="text-[11px] text-ink-400 shrink-0 ml-2">
            {relativeTime(summary.lastAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-[12px] truncate',
            unread > 0 ? 'text-ink-700 font-medium' : 'text-ink-400',
          )}>
            {preview}
          </span>
          {unread > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-mint flex items-center justify-center text-[10px] font-bold text-black px-1">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Thread view ───────────────────────────────────────────────────────────────

function Thread({
  cleaner,
  messages,
}: {
  cleaner: Cleaner
  messages: Message[]
}) {
  const groups: { date: string; msgs: Message[] }[] = []
  for (const m of messages) {
    const label = formatDate(m.createdAt)
    const last = groups[groups.length - 1]
    if (last?.date === label) last.msgs.push(m)
    else groups.push({ date: label, msgs: [m] })
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pb-16">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4 text-[18px] font-bold text-black"
          style={{ backgroundColor: cleaner.color }}
        >
          {cleaner.initials}
        </div>
        <p className="text-[15px] font-semibold text-ink-700">Start a conversation</p>
        <p className="text-[13px] text-ink-400 mt-1">
          Send {cleaner.name.split(' ')[0]} a message
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4 px-5">
      {groups.map(group => (
        <div key={group.date}>
          {/* Date divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-[0.06em]">
              {group.date}
            </span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <div className="space-y-1">
            {group.msgs.map((m, idx) => {
              const isOwner = m.senderRole === 'owner'
              const isFirst = idx === 0 || group.msgs[idx - 1].senderRole !== m.senderRole
              const isLast = idx === group.msgs.length - 1 || group.msgs[idx + 1].senderRole !== m.senderRole

              return (
                <div key={m.id} className={cn('flex flex-col', isOwner ? 'items-end' : 'items-start')}>
                  {isFirst && !isOwner && (
                    <div className="flex items-center gap-2 mb-1 ml-1">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
                        style={{ backgroundColor: cleaner.color }}
                      >
                        {cleaner.initials}
                      </div>
                      <span className="text-[11px] font-semibold text-ink-500">{cleaner.name}</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[72%] px-4 py-2.5',
                      isOwner
                        ? 'bg-mint text-black rounded-2xl' +
                          (isFirst ? ' rounded-tr-md' : '') +
                          (isLast ? ' rounded-br-sm' : '')
                        : 'bg-soft border border-line text-ink-900 rounded-2xl' +
                          (isFirst ? ' rounded-tl-md' : '') +
                          (isLast ? ' rounded-bl-sm' : ''),
                    )}
                  >
                    <p className="text-[13.5px] leading-[1.5]">{m.content}</p>
                  </div>
                  {isLast && (
                    <p className={cn('text-[11px] mt-1 mb-0.5', isOwner ? 'text-ink-400 mr-1' : 'text-ink-400 ml-1')}>
                      {formatTime(m.createdAt)}
                    </p>
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

  // Group all messages by cleaner for sidebar summaries
  const summaryMap = useMemo<Record<string, ConversationSummary>>(() => {
    const map: Record<string, ConversationSummary> = {}
    for (const m of messages) {
      const existing = map[m.cleanerId]
      if (!existing || m.createdAt > existing.lastAt!) {
        map[m.cleanerId] = {
          cleanerId: m.cleanerId,
          lastContent: m.content,
          lastSenderRole: m.senderRole,
          lastAt: m.createdAt,
        }
      }
    }
    return map
  }, [messages])

  // Sort cleaners: those with messages first (by recency), then alphabetically
  const sortedCleaners = useMemo(() => {
    return [...cleaners].sort((a, b) => {
      const aAt = summaryMap[a.id]?.lastAt ?? ''
      const bAt = summaryMap[b.id]?.lastAt ?? ''
      if (aAt || bAt) return bAt.localeCompare(aAt)
      return a.name.localeCompare(b.name)
    })
  }, [cleaners, summaryMap])

  // Messages for the selected conversation
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

  // Scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages.length])

  // Mark read when conversation opened
  useEffect(() => {
    if (!selectedId) return
    clearUnread(selectedId)
    markCleanerMessagesRead(selectedId).catch(() => {})
  }, [selectedId, clearUnread])

  // Global realtime: all messages → update state + sidebar + unread
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel('dashboard-chat-global')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, payload => {
        const r = payload.new as {
          id: string; cleaner_id: string; sender_role: string
          content: string; read_at: string | null; created_at: string
        }
        const msg: Message = {
          id: r.id, cleanerId: r.cleaner_id,
          senderRole: r.sender_role as 'owner' | 'cleaner',
          content: r.content, readAt: r.read_at, createdAt: r.created_at,
        }
        setMessages(prev => [...prev, msg])
        // Track unread only for cleaner messages not in the open conversation
        if (r.sender_role === 'cleaner' && r.cleaner_id !== selectedId) {
          incrementUnread(r.cleaner_id)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId, incrementUnread])

  function selectCleaner(id: string) {
    setSelectedId(id)
    setText('')
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isPending || !selectedId) return
    setText('')
    startTransition(async () => {
      await sendOwnerMessage(selectedId, trimmed)
    })
  }

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-line bg-rail">
        {/* Sidebar header */}
        <div className="px-4 pt-5 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-mint" />
            <h2 className="text-[13px] font-semibold text-ink-900 tracking-[-0.01em]">Direct Messages</h2>
          </div>
        </div>

        {/* Cleaner list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {sortedCleaners.map(cleaner => (
            <CleanerRow
              key={cleaner.id}
              cleaner={cleaner}
              summary={summaryMap[cleaner.id] ?? { cleanerId: cleaner.id, lastContent: null, lastSenderRole: null, lastAt: null }}
              unread={unreadMap[cleaner.id] ?? 0}
              selected={selectedId === cleaner.id}
              onClick={() => selectCleaner(cleaner.id)}
            />
          ))}
        </div>
      </aside>

      {/* ── Main chat area ───────────────────────────────────────── */}
      {selectedCleaner ? (
        <div className="flex flex-col flex-1 min-w-0">

          {/* Thread header */}
          <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-line bg-rail">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-black shrink-0"
              style={{ backgroundColor: selectedCleaner.color }}
            >
              {selectedCleaner.initials}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink-900 leading-tight">{selectedCleaner.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  selectedCleaner.status === 'available' ? 'bg-mint' : 'bg-ink-300',
                )} />
                <p className="text-[12px] text-ink-500 capitalize">{selectedCleaner.status}</p>
              </div>
            </div>
          </div>

          {/* Thread scroll area */}
          <div className="flex-1 overflow-y-auto">
            <Thread cleaner={selectedCleaner} messages={threadMessages} />
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-line bg-rail px-5 py-3">
            <div className="flex items-end gap-2.5">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder={`Message ${selectedCleaner.name.split(' ')[0]}…`}
                  rows={1}
                  className="w-full resize-none rounded-[10px] border border-line bg-soft px-4 py-2.5 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-mint/40 transition-colors leading-[1.5] overflow-hidden"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!text.trim() || isPending}
                className="w-9 h-9 rounded-full bg-mint flex items-center justify-center shrink-0 transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed mb-0.5"
              >
                <Send size={14} className="text-black translate-x-[1px] -translate-y-[1px]" />
              </button>
            </div>
            <p className="text-[11px] text-ink-400 mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center flex-col gap-3 text-center">
          <MessageSquare className="h-10 w-10 text-ink-300" />
          <p className="text-[13px] text-ink-500">No cleaners yet</p>
        </div>
      )}
    </div>
  )
}
