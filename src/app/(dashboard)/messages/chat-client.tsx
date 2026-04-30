'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Send, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cleaner } from '@/types'
import type { Message } from '@/lib/data'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { sendOwnerMessage, markCleanerMessagesRead } from './actions'
import { useChatStore } from '@/store/useChatStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function relativeTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (d.toDateString() === now.toDateString()) return formatTime(iso)
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MsgGroup = { sender: 'owner' | 'cleaner'; msgs: Message[] }

function toGroups(msgs: Message[]): MsgGroup[] {
  return msgs.reduce<MsgGroup[]>((acc, m) => {
    const last = acc[acc.length - 1]
    if (last && last.sender === m.senderRole) { last.msgs.push(m); return acc }
    return [...acc, { sender: m.senderRole, msgs: [m] }]
  }, [])
}

type ConvSummary = {
  cleanerId: string
  lastContent: string | null
  lastSenderRole: 'owner' | 'cleaner' | null
  lastAt: string | null
}

// ── Sidebar row ───────────────────────────────────────────────────────────────

function SidebarRow({ cleaner, summary, unread, active, onClick }: {
  cleaner: Cleaner
  summary: ConvSummary
  unread: number
  active: boolean
  onClick: () => void
}) {
  const preview = summary.lastContent
    ? (summary.lastSenderRole === 'owner' ? 'You: ' : '') + summary.lastContent
    : 'No messages yet'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-100',
        active ? 'bg-[#1a2a1e]' : 'hover:bg-[#151f18]',
      )}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold text-black"
        style={{ backgroundColor: cleaner.color }}
      >
        {cleaner.initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn('text-[13px] font-semibold truncate leading-tight', active ? 'text-white' : 'text-[#d1d2d3]')}>
            {cleaner.name}
          </span>
          {summary.lastAt && (
            <span className="text-[10.5px] text-[#616061] shrink-0">{relativeTime(summary.lastAt)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-[12px] truncate leading-tight', unread > 0 ? 'text-[#d1d2d3] font-medium' : 'text-[#616061]')}>
            {preview}
          </span>
          {unread > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-mint-500 flex items-center justify-center text-[10px] font-bold text-white px-1">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Message group (Slack style) ───────────────────────────────────────────────

function MsgGroupRow({ group, cleaner }: { group: MsgGroup; cleaner: Cleaner }) {
  const isOwner = group.sender === 'owner'
  const name = isOwner ? 'You' : cleaner.name
  const avatarBg = isOwner ? '#1ED760' : cleaner.color
  const avatarText = isOwner ? 'K' : cleaner.initials
  const firstTime = group.msgs[0].createdAt

  return (
    <div className="group flex gap-3 px-6 py-0.5 hover:bg-white/[0.02] transition-colors">
      {/* Avatar column — always 36px wide */}
      <div className="w-9 shrink-0 pt-0.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-black"
          style={{ backgroundColor: avatarBg }}
        >
          {avatarText}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + timestamp */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className={cn('text-[13.5px] font-bold leading-none', isOwner ? 'text-mint-500' : 'text-white')}>
            {name}
          </span>
          <span className="text-[11px] text-[#616061] leading-none">{formatTime(firstTime)}</span>
        </div>

        {/* All messages in this group */}
        <div className="space-y-0.5">
          {group.msgs.map(m => (
            <p key={m.id} className="text-[14px] text-[#d1d2d3] leading-[1.6] break-words">
              {m.content}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Thread ────────────────────────────────────────────────────────────────────

function Thread({ cleaner, messages }: { cleaner: Cleaner; messages: Message[] }) {
  // Group by date, then by consecutive sender within each date
  type DateSection = { date: string; groups: MsgGroup[] }
  const sections: DateSection[] = []
  for (const m of messages) {
    const label = formatDate(m.createdAt)
    let sec = sections.find(s => s.date === label)
    if (!sec) { sec = { date: label, groups: [] }; sections.push(sec) }
    const lastGrp = sec.groups[sec.groups.length - 1]
    if (lastGrp && lastGrp.sender === m.senderRole) lastGrp.msgs.push(m)
    else sec.groups.push({ sender: m.senderRole, msgs: [m] })
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-[20px] font-bold text-black"
          style={{ backgroundColor: cleaner.color }}
        >
          {cleaner.initials}
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-white">{cleaner.name}</p>
          <p className="text-[13px] text-[#616061] mt-1">
            This is the beginning of your direct message history with <strong className="text-[#d1d2d3]">{cleaner.name.split(' ')[0]}</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-4">
      {sections.map(sec => (
        <div key={sec.date}>
          {/* Date divider */}
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex-1 h-px bg-[#2f3135]" />
            <span className="text-[11.5px] font-semibold text-[#616061] border border-[#2f3135] rounded-full px-3 py-0.5">
              {sec.date}
            </span>
            <div className="flex-1 h-px bg-[#2f3135]" />
          </div>

          {/* Message groups */}
          <div className="space-y-4">
            {sec.groups.map((grp, i) => (
              <MsgGroupRow key={i} group={grp} cleaner={cleaner} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ChatClient({ cleaners, initialMessages }: {
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

  const summaryMap = useMemo<Record<string, ConvSummary>>(() => {
    const map: Record<string, ConvSummary> = {}
    for (const m of messages) {
      const ex = map[m.cleanerId]
      if (!ex || m.createdAt > (ex.lastAt ?? '')) {
        map[m.cleanerId] = { cleanerId: m.cleanerId, lastContent: m.content, lastSenderRole: m.senderRole, lastAt: m.createdAt }
      }
    }
    return map
  }, [messages])

  const sortedCleaners = useMemo(() =>
    [...cleaners].sort((a, b) => {
      const aAt = summaryMap[a.id]?.lastAt ?? ''
      const bAt = summaryMap[b.id]?.lastAt ?? ''
      if (aAt || bAt) return bAt.localeCompare(aAt)
      return a.name.localeCompare(b.name)
    }), [cleaners, summaryMap])

  const threadMessages = useMemo(
    () => messages.filter(m => m.cleanerId === selectedId),
    [messages, selectedId],
  )

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages.length])

  useEffect(() => {
    if (!selectedId) return
    clearUnread(selectedId)
    markCleanerMessagesRead(selectedId).catch(() => {})
  }, [selectedId, clearUnread])

  useEffect(() => {
    const sb = getSupabaseBrowserClient()
    const ch = sb.channel('dashboard-chat-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: r }) => {
        const row = r as { id: string; cleaner_id: string; sender_role: string; content: string; read_at: string | null; created_at: string }
        setMessages(prev => [...prev, { id: row.id, cleanerId: row.cleaner_id, senderRole: row.sender_role as 'owner' | 'cleaner', content: row.content, readAt: row.read_at, createdAt: row.created_at }])
        if (row.sender_role === 'cleaner' && row.cleaner_id !== selectedId) incrementUnread(row.cleaner_id)
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [selectedId, incrementUnread])

  function handleSend() {
    const t = text.trim()
    if (!t || isPending || !selectedId) return
    setText('')
    startTransition(async () => { await sendOwnerMessage(selectedId, t) })
  }

  return (
    // Slack uses a very dark, slightly warm-dark background
    <div className="flex h-[calc(100vh-60px)] overflow-hidden" style={{ backgroundColor: '#1a1d21' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r overflow-hidden" style={{ backgroundColor: '#19232a', borderColor: '#2f3135' }}>
        {/* Workspace header */}
        <div className="px-4 py-4 border-b shrink-0 flex items-center gap-2" style={{ borderColor: '#2f3135' }}>
          <Hash className="h-4 w-4 shrink-0" style={{ color: '#616061' }} />
          <span className="text-[13px] font-bold" style={{ color: '#d1d2d3' }}>Direct Messages</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-px">
          {sortedCleaners.map(c => (
            <SidebarRow
              key={c.id}
              cleaner={c}
              summary={summaryMap[c.id] ?? { cleanerId: c.id, lastContent: null, lastSenderRole: null, lastAt: null }}
              unread={unreadMap[c.id] ?? 0}
              active={selectedId === c.id}
              onClick={() => { setSelectedId(c.id); setText('') }}
            />
          ))}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      {selectedCleaner ? (
        <div className="flex flex-col flex-1 min-w-0" style={{ backgroundColor: '#1a1d21' }}>

          {/* Channel header */}
          <div className="shrink-0 flex items-center gap-3 px-6 h-14 border-b" style={{ borderColor: '#2f3135' }}>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-black shrink-0"
              style={{ backgroundColor: selectedCleaner.color }}
            >
              {selectedCleaner.initials}
            </div>
            <span className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
              {selectedCleaner.name}
            </span>
            <div className={cn('w-2 h-2 rounded-full ml-1', selectedCleaner.status === 'available' ? 'bg-mint-500' : 'bg-[#616061]')} />
            <span className="text-[12px] capitalize" style={{ color: '#616061' }}>{selectedCleaner.status}</span>
          </div>

          {/* Thread */}
          <div className="flex-1 overflow-y-auto">
            <Thread cleaner={selectedCleaner} messages={threadMessages} />
            <div ref={bottomRef} className="h-4" />
          </div>

          {/* Input — Slack style: bordered box with rounded corners */}
          <div className="shrink-0 px-6 pb-6 pt-3">
            <div
              className="rounded-lg border overflow-hidden"
              style={{ backgroundColor: '#222529', borderColor: '#565856' }}
            >
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder={`Message ${selectedCleaner.name}`}
                rows={1}
                style={{ color: '#d1d2d3' }}
                className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[14px] placeholder:text-[#616061] focus:outline-none leading-[1.6] min-h-[44px]"
              />
              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                <span className="text-[11px]" style={{ color: '#616061' }}>
                  <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line
                </span>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#1ED760', color: '#000' }}
                >
                  <Send size={12} />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: '#1a1d21' }}>
          <p className="text-[13px]" style={{ color: '#616061' }}>Select a conversation</p>
        </div>
      )}
    </div>
  )
}
