'use client'
import { useState, useEffect } from 'react'
import { Bell, Menu, Search, Plus, Command, UserPlus, Calendar, LinkIcon } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import * as Popover from '@radix-ui/react-popover'
import { CommandPalette } from './CommandPalette'
import { NotificationsPopover } from './NotificationsPopover'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':  { title: 'Dashboard',     sub: 'Today\'s operations and KPIs' },
  '/scheduling': { title: 'Scheduling',    sub: 'Calendar and team assignment' },
  '/map':        { title: 'Live Map',      sub: 'Real-time crew & route view' },
  '/customers':  { title: 'Customers',     sub: 'CRM and client management' },
  '/team':       { title: 'Team',          sub: 'Cleaner roster and utilization' },
  '/payments':   { title: 'Payments',      sub: 'Revenue and ledger' },
  '/analytics':  { title: 'Analytics',     sub: 'Performance reports' },
  '/marketing':  { title: 'Marketing',     sub: 'Posts and group reach' },
  '/campaigns':  { title: 'Campaigns',     sub: 'Nurturing and booking links' },
  '/inbox':      { title: 'Inbox',         sub: 'Customer conversations' },
  '/messages':   { title: 'Messages',      sub: 'On-the-way and update templates' },
}

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const info = Object.entries(PAGE_META).find(([k]) => pathname.startsWith(k))?.[1]
            ?? { title: 'Kardama', sub: '' }

  const [paletteOpen, setPaletteOpen] = useState(false)

  // Cmd+K / Ctrl+K opens the palette anywhere
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
      <header className="sticky top-0 z-30 flex h-[60px] flex-shrink-0 items-center gap-3 border-b border-line bg-page/85 backdrop-blur-md px-4 md:gap-4 md:px-6">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-ink-400 transition-colors hover:bg-soft hover:text-ink-900 md:hidden"
        >
          <Menu className="h-[17px] w-[17px]" />
        </button>

        {/* Page title */}
        <div className="min-w-0 flex-shrink-0">
          <h1 className="truncate text-[15px] font-semibold text-ink-900 tracking-[-0.005em] leading-tight">
            {info.title}
          </h1>
          {info.sub && (
            <p className="hidden md:block truncate text-[11.5px] text-ink-400 mt-0.5 leading-tight">{info.sub}</p>
          )}
        </div>

        {/* Search bar — opens palette */}
        <div className="hidden lg:flex flex-1 max-w-[480px] mx-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex h-9 w-full items-center gap-2.5 rounded-[8px] border border-line bg-soft/40 px-3 text-left text-[12.5px] text-ink-400 transition-colors hover:border-line-strong hover:bg-soft hover:text-ink-500"
          >
            <Search className="h-[14px] w-[14px] flex-shrink-0" />
            <span className="flex-1 truncate">Search…</span>
            <span className="kbd flex items-center gap-0.5">
              <Command className="h-[10px] w-[10px]" />K
            </span>
          </button>
        </div>

        {/* Spacer when search hidden */}
        <div className="lg:hidden flex-1" />

        {/* Action cluster */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* AI status pill */}
          <div className="ai-pill hidden md:inline-flex">
            <span className="pulse" />
            AI Online
          </div>

          {/* Mobile search */}
          <button
            type="button"
            aria-label="Search"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-soft/40 text-ink-400 transition-colors hover:bg-soft hover:text-ink-900 hover:border-line-strong lg:hidden"
          >
            <Search className="h-[15px] w-[15px]" />
          </button>

          {/* + New popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-b from-mint-400 to-mint-600 px-3 text-[12.5px] font-semibold text-page transition-[filter,box-shadow] hover:brightness-110 shadow-[0_2px_8px_-2px_rgba(94,234,212,0.45)]"
              >
                <Plus className="h-[15px] w-[15px]" strokeWidth={2.5} />
                New
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                className="z-50 w-[260px] rounded-[12px] border border-line-strong bg-card p-1.5 shadow-[var(--shadow-pop)] anim-fade-in"
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
              className="relative flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-soft/40 text-ink-400 transition-colors hover:bg-soft hover:text-ink-900 hover:border-line-strong"
            >
              <Bell className="h-[15px] w-[15px]" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-mint-500 ring-2 ring-page" />
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
        className="group flex w-full items-start gap-3 rounded-[8px] px-2.5 py-2.5 text-left transition-colors hover:bg-soft"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-mint-500/10 text-mint-500">
          <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-900 leading-tight">{title}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-400 leading-tight">{hint}</p>
        </div>
      </button>
    </Popover.Close>
  )
}
