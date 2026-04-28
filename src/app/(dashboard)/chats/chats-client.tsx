'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import type { Cleaner } from '@/types'
import { sendMessageToCleaner, getCleanerMessages } from './actions'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Msg = { id: string; cleaner_id: string; sender_role: string; content: string; read_at: string | null; created_at: string }

function ts(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function ChatsClient({ cleaners }: { cleaners: Cleaner[] }) {
  const [selected, setSelected] = useState<Cleaner | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load messages when cleaner is selected
  useEffect(() => {
    if (!selected) return
    setMessages([])
    getCleanerMessages(selected.id).then(data => setMessages(data as Msg[]))
    setUnreadMap(prev => ({ ...prev, [selected.id]: 0 }))
  }, [selected])

  // Subscribe to all new cleaner messages
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel('owner-chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new as Msg
        if (selected && m.cleaner_id === selected.id) {
          setMessages(prev => [...prev, m])
        } else if (m.sender_role === 'cleaner') {
          setUnreadMap(prev => ({ ...prev, [m.cleaner_id]: (prev[m.cleaner_id] ?? 0) + 1 }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const trimmed = text.trim()
    if (!selected || !trimmed || isPending) return
    setText('')
    startTransition(async () => { await sendMessageToCleaner(selected.id, trimmed) })
  }

  return (
    <div className="flex h-full">
      {/* Cleaner list */}
      <div className="w-64 border-r border-line bg-rail flex-shrink-0 flex flex-col">
        <div className="px-4 py-4 border-b border-line">
          <h2 className="text-[13px] font-bold text-ink-900">Cleaner Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-line">
          {cleaners.map(c => {
            const active = selected?.id === c.id
            const badge = unreadMap[c.id] ?? 0
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-soft ${active ? 'bg-hover' : ''}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: c.color }}
                >
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink-900 truncate">{c.name.split(' ')[0]}</p>
                  <p className={`text-[11px] truncate ${active ? 'text-mint-400' : 'text-ink-400'}`}>{c.status}</p>
                </div>
                {badge > 0 && (
                  <span className="w-5 h-5 rounded-full bg-mint-400 text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="px-6 py-4 border-b border-line flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: selected.color }}
            >
              {selected.initials}
            </div>
            <div>
              <p className="text-[14px] font-bold text-ink-900">{selected.name}</p>
              <p className="text-[11px] text-ink-400 capitalize">{selected.status.replace('-', ' ')}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-[13px] text-ink-400 mt-12">No messages yet. Say hi!</p>
            )}
            {messages.map(m => {
              const isOwner = m.sender_role === 'owner'
              return (
                <div key={m.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${
                      isOwner
                        ? 'bg-mint-400 text-black rounded-br-sm'
                        : 'bg-elev text-ink-900 rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                    <p className={`text-[10px] mt-1 ${isOwner ? 'text-black/40' : 'text-ink-400'}`}>{ts(m.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-line px-6 py-4 flex items-end gap-3">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={`Message ${selected.name.split(' ')[0]}…`}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-line bg-rail px-4 py-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-mint-400 transition-colors max-h-28"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || isPending}
              className="h-10 w-10 rounded-xl bg-mint-400 flex items-center justify-center transition-colors hover:bg-mint-300 disabled:opacity-40 shrink-0"
            >
              <Send size={15} className="text-black translate-x-px" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-ink-400 text-[14px]">
          Select a cleaner to start messaging
        </div>
      )}
    </div>
  )
}
