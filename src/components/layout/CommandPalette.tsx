'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Users, CalendarDays, LayoutDashboard, Map, DollarSign,
  Megaphone, Bell, MessageSquare, Send, UserCheck, BarChart3, Plus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Command = {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  group: 'Pages' | 'Actions'
  perform: () => void
}

interface Props { open: boolean; onClose: () => void }

/**
 * CommandPalette — Cmd+K / Ctrl+K. Searches static pages + actions.
 * Future: extend with customer/job results when they're indexed in Edge Config
 * or via a server action. For now this keeps the search button useful.
 */
export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allCommands: Command[] = useMemo(() => [
    { id: 'go-dashboard',  label: 'Dashboard',  hint: 'Today\'s jobs and metrics', icon: LayoutDashboard, group: 'Pages',   perform: () => router.push('/dashboard') },
    { id: 'go-scheduling', label: 'Scheduling', hint: 'Calendar and team assignment', icon: CalendarDays,    group: 'Pages',   perform: () => router.push('/scheduling') },
    { id: 'go-map',        label: 'Live Map',   hint: 'Real-time crew tracking',  icon: Map,             group: 'Pages',   perform: () => router.push('/map') },
    { id: 'go-customers',  label: 'Customers',  hint: 'CRM',                       icon: Users,           group: 'Pages',   perform: () => router.push('/customers') },
    { id: 'go-team',       label: 'Team',       hint: 'Cleaner roster',           icon: UserCheck,       group: 'Pages',   perform: () => router.push('/team') },
    { id: 'go-payments',   label: 'Payments',   hint: 'Revenue ledger',           icon: DollarSign,      group: 'Pages',   perform: () => router.push('/payments') },
    { id: 'go-analytics',  label: 'Analytics',  hint: 'Reports',                   icon: BarChart3,       group: 'Pages',   perform: () => router.push('/analytics') },
    { id: 'go-marketing',  label: 'Marketing',  hint: 'Posts and groups',          icon: Megaphone,       group: 'Pages',   perform: () => router.push('/marketing') },
    { id: 'go-campaigns',  label: 'Campaigns',  hint: 'Booking links',             icon: Bell,            group: 'Pages',   perform: () => router.push('/campaigns') },
    { id: 'go-inbox',      label: 'Inbox',      hint: 'Customer conversations',   icon: MessageSquare,   group: 'Pages',   perform: () => router.push('/inbox') },
    { id: 'go-messages',   label: 'Messages',   hint: 'On-the-way templates',     icon: Send,            group: 'Pages',   perform: () => router.push('/messages') },
    { id: 'new-customer',  label: 'New customer',  hint: 'Add a customer to CRM', icon: Plus, group: 'Actions', perform: () => router.push('/customers?new=1') },
    { id: 'new-job',       label: 'New job',       hint: 'Schedule a cleaning',   icon: Plus, group: 'Actions', perform: () => router.push('/scheduling') },
    { id: 'new-link',      label: 'New booking link', hint: 'Generate a /book/<token>', icon: Plus, group: 'Actions', perform: () => router.push('/campaigns') },
  ], [router])

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands
    const q = query.toLowerCase()
    return allCommands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.hint?.toLowerCase().includes(q)
    )
  }, [query, allCommands])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    } else {
      setQuery('')
      setActiveIdx(0)
    }
  }, [open])

  // Reset highlight when filter changes
  useEffect(() => { setActiveIdx(0) }, [query])

  // Esc / Enter / arrows
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[activeIdx]
        if (cmd) { cmd.perform(); onClose() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, activeIdx, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  // Group results
  const grouped: Record<Command['group'], Command[]> = { Pages: [], Actions: [] }
  for (const cmd of filtered) grouped[cmd.group].push(cmd)

  let runningIdx = 0

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[14vh] px-4 anim-fade-in" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-page/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[560px] rounded-[14px] border border-line-strong bg-card shadow-[var(--shadow-pop)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-[16px] w-[16px] flex-shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <span className="kbd">esc</span>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-1.5">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-[13px] text-ink-400">
              No matches for "{query}"
            </p>
          )}

          {(['Pages', 'Actions'] as const).map((group) => {
            if (grouped[group].length === 0) return null
            return (
              <div key={group} className="px-1.5 py-1">
                <p className="grid-label px-2.5 py-1.5">{group}</p>
                {grouped[group].map((cmd) => {
                  const idx = runningIdx++
                  const Icon = cmd.icon
                  const active = idx === activeIdx
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => { cmd.perform(); onClose() }}
                      onMouseMove={() => setActiveIdx(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left',
                        'transition-colors',
                        active ? 'bg-soft' : 'hover:bg-soft/60',
                      )}
                    >
                      <Icon className={cn('h-[15px] w-[15px] flex-shrink-0', active ? 'text-mint-400' : 'text-ink-400')} strokeWidth={1.75} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-ink-900 leading-tight">{cmd.label}</p>
                        {cmd.hint && (
                          <p className="truncate text-[11.5px] text-ink-400 mt-0.5">{cmd.hint}</p>
                        )}
                      </div>
                      {active && <span className="kbd">↵</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-soft/40 px-4 py-2">
          <span className="text-[11px] text-ink-400">
            <span className="kbd">↑↓</span> <span className="ml-1.5">navigate</span>
          </span>
          <span className="text-[11px] text-ink-400">
            <span className="kbd">↵</span> <span className="ml-1.5">select</span>
          </span>
        </div>
      </div>
    </div>
  )
}
