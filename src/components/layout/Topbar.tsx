'use client'
import { useState, useEffect } from 'react'
import { Bell, Menu, Search, Plus, Command, UserPlus, Calendar, LinkIcon } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import * as Popover from '@radix-ui/react-popover'
import { CommandPalette } from './CommandPalette'
import { NotificationsPopover } from './NotificationsPopover'
import { useChatStore } from '@/store/useChatStore'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':  { title: 'Dashboard',     sub: 'Today\'s operations' },
  '/scheduling': { title: 'Scheduling',    sub: 'Calendar & team assignment' },
  '/map':        { title: 'Live Map',      sub: 'Real-time crew & routes' },
  '/customers':  { title: 'Customers',     sub: 'CRM & client management' },
  '/team':       { title: 'Team',          sub: 'Cleaner roster & utilization' },
  '/payments':   { title: 'Payments',      sub: 'Revenue & ledger' },
  '/analytics':  { title: 'Analytics',     sub: 'Performance reports' },
  '/marketing':  { title: 'Marketing',     sub: 'Posts & group reach' },
  '/campaigns':  { title: 'Campaigns',     sub: 'Nurturing & booking links' },
  '/inbox':      { title: 'Inbox',         sub: 'Customer conversations' },
  '/messages':   { title: 'Messages',      sub: 'On-the-way & update templates' },
}

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const info = Object.entries(PAGE_META).find(([k]) => pathname.startsWith(k))?.[1]
            ?? { title: 'Kardama', sub: '' }

  const [paletteOpen, setPaletteOpen] = useState(false)
  const hasUnread = useChatStore(s => s.notifications.some(n => !n.read))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[62px] flex-shrink-0 items-center gap-3 border-b border-line bg-rail/95 backdrop-blur-md px-4 md:gap-4 md:px-6">

        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-[7px] text-ink-400 transition-colors hover:bg-soft hover:text-ink-700 md:hidden"
        >
          <Menu className="h-[16px] w-[16px]" />
        </button>

        {/* Page title */}
        <div className="min-w-0 flex-shrink-0">
          <h1 className="truncate text-[14.5px] font-semibold text-ink-900 tracking-[-0.015em] leading-tight">
            {info.title}
          </h1>
          {info.sub && (
            <p className="hidden md:block truncate text-[12px] text-ink-500 mt-0.5 leading-tight">
              {info.sub}
            </p>
          )}
        </div>

        {/* Search bar */}
        <div className="hidden lg:flex flex-1 max-w-[360px] mx-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex h-[34px] w-full items-center gap-2.5 rounded-[8px] bg-soft border border-line px-3.5 text-left text-[13px] text-ink-500 font-medium transition-all duration-150 hover:bg-hover hover:border-line-strong"
          >
            <Search className="h-[13px] w-[13px] flex-shrink-0" />
            <span className="flex-1 truncate">Search…</span>
            <span className="kbd flex items-center gap-0.5 text-[11px]">
              <Command className="h-[8px] w-[8px]" />K
            </span>
          </button>
        </div>

        {/* Spacer */}
        <div className="lg:hidden flex-1" />

        {/* Right cluster */}
        <div className="flex flex-shrink-0 items-center gap-2">

          {/* AI pill */}
          <div className="ai-pill hidden md:inline-flex">
            <span className="pulse" />
            AI Online
          </div>

          {/* Mobile search */}
          <button
            type="button"
            aria-label="Search"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-soft text-ink-500 transition-colors hover:bg-hover hover:text-ink-700 lg:hidden"
          >
            <Search className="h-[14px] w-[14px]" />
          </button>

          {/* + New */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="hidden sm:inline-flex h-[34px] items-center gap-1.5 rounded-[7px] bg-mint-400 px-3.5 text-[12.5px] font-semibold text-black shadow-[0_2px_14px_-3px_rgba(29,185,84,0.5)] transition-all duration-150 hover:bg-mint-500 hover:scale-[1.03] active:scale-[0.97]"
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={2.5} />
                New
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                className="z-50 w-[236px] rounded-[10px] border border-line-strong bg-card p-1.5 shadow-[var(--shadow-pop)] anim-fade-in"
              >
                <NewMenuItem
                  icon={UserPlus}
                  title="Customer"
                  hint="Add a new client"
                  onSelect={() => router.push('/customers?new=1')}
                />
                <NewMenuItem
                  icon={Calendar}
                  title="Job"
                  hint="Schedule a cleaning"
                  onSelect={() => router.push('/scheduling')}
                />
                <NewMenuItem
                  icon={LinkIcon}
                  title="Booking link"
                  hint="Shareable /book/<token>"
                  onSelect={() => router.push('/campaigns')}
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Notifications */}
          <NotificationsPopover>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-[7px] bg-soft text-ink-500 transition-colors hover:bg-hover hover:text-ink-700"
            >
              <Bell className="h-[14px] w-[14px]" strokeWidth={1.75} />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 h-[6px] w-[6px] rounded-full bg-red-500 shadow-[0_0_0_2px_var(--color-page)]" />
              )}
            </button>
          </NotificationsPopover>

        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}

function NewMenuItem({
  icon: Icon, title, hint, onSelect,
}: {
  icon: React.ElementType
  title: string
  hint: string
  onSelect: () => void
}) {
  return (
    <Popover.Close asChild>
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full items-start gap-3 rounded-[7px] px-2.5 py-2.5 text-left transition-colors hover:bg-soft"
      >
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] bg-mint-500/10 text-mint-500">
          <Icon className="h-[13px] w-[13px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-ink-900 leading-tight">{title}</p>
          <p className="mt-0.5 text-[12px] text-ink-500 leading-tight">{hint}</p>
        </div>
      </button>
    </Popover.Close>
  )
}
