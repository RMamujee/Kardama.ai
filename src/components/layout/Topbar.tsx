'use client'
import { Bell, Menu, Search, Plus, Command } from 'lucide-react'
import { usePathname } from 'next/navigation'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':  { title: 'Dashboard',     sub: 'Saturday, April 25 · Long Beach' },
  '/scheduling': { title: 'Scheduling',    sub: 'Smart team assignment' },
  '/map':        { title: 'Live Map',      sub: 'Real-time crew & route view' },
  '/customers':  { title: 'Customers',     sub: 'CRM & client management' },
  '/team':       { title: 'Team',          sub: 'Cleaner roster & utilization' },
  '/payments':   { title: 'Payments',      sub: 'Revenue & ledger' },
  '/analytics':  { title: 'Analytics',     sub: 'Business intelligence' },
  '/marketing':  { title: 'Marketing',     sub: 'Automation & scheduling' },
  '/campaigns':  { title: 'Campaigns',     sub: 'Nurturing & booking links' },
  '/inbox':      { title: 'Inbox',         sub: '2 unread · 1 needs reply' },
  '/messages':   { title: 'Messages',      sub: 'Client communications' },
}

/**
 * Topbar — operations-console header.
 *   ┌─[menu]─[Title / sub]──── search bar (grows) ────[+ New][bell][AI][avatar]─┐
 *
 * Uses a real grid so the search bar takes the negative space instead of
 * fighting the title for it. No more overlap on tablet widths.
 */
export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname()
  const info = Object.entries(PAGE_META).find(([k]) => pathname.startsWith(k))?.[1]
            ?? { title: 'Kardama', sub: '' }

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-line bg-page/80 backdrop-blur-md px-4 md:gap-4 md:px-6">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        className="flex h-9 w-9 items-center justify-center rounded-[6px] text-ink-400 transition-colors hover:bg-soft hover:text-ink-900 md:hidden"
      >
        <Menu className="h-[17px] w-[17px]" />
      </button>

      {/* Page title + sub. Truncates on narrow viewports so it doesn't push
          the action cluster off-screen. */}
      <div className="min-w-0 max-w-[240px] flex-shrink-0">
        <h1 className="truncate text-[15px] font-semibold text-ink-900 tracking-[-0.01em] leading-none">
          {info.title}
        </h1>
        {info.sub && (
          <p className="hidden md:block truncate text-[11.5px] text-ink-400 mt-1 font-mono tracking-wide">
            {info.sub}
          </p>
        )}
      </div>

      {/* Search — operates as a real input, takes any leftover space.
          Hidden on small screens to leave room for the action cluster. */}
      <div className="hidden lg:flex flex-1 max-w-[480px] mx-2">
        <button
          type="button"
          className="group flex h-9 w-full items-center gap-2.5 rounded-[6px] border border-line bg-soft/60 px-3 text-left text-[12.5px] text-ink-400 transition-colors hover:border-line-strong hover:bg-soft"
        >
          <Search className="h-[15px] w-[15px] flex-shrink-0 text-ink-400" />
          <span className="flex-1 truncate">Search customers, jobs, cleaners…</span>
          <span className="kbd flex items-center gap-0.5">
            <Command className="h-3 w-3" />K
          </span>
        </button>
      </div>

      {/* Push everything else to the right when search isn't visible */}
      <div className="lg:hidden flex-1" />

      {/* Action cluster — sized to never collide with the search bar */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* AI status — informational only */}
        <div className="ai-pill hidden md:inline-flex">
          <span className="pulse" />
          AI Online
        </div>

        {/* Mobile search button (only when full search bar is hidden) */}
        <button
          type="button"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-line bg-soft/60 text-ink-400 transition-colors hover:bg-soft hover:text-ink-900 hover:border-line-strong lg:hidden"
        >
          <Search className="h-[15px] w-[15px]" />
        </button>

        {/* Primary action */}
        <button
          type="button"
          className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-mint-500 px-3 text-[12.5px] font-semibold text-page transition-colors hover:bg-mint-400"
        >
          <Plus className="h-[15px] w-[15px]" strokeWidth={2.5} />
          New
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-line bg-soft/60 text-ink-400 transition-colors hover:bg-soft hover:text-ink-900 hover:border-line-strong"
        >
          <Bell className="h-[15px] w-[15px]" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-mint-500 ring-2 ring-page" />
        </button>

        {/* Avatar */}
        <button
          type="button"
          aria-label="Account"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[6px] bg-mint-500 font-mono text-[11.5px] font-semibold text-page transition-opacity hover:opacity-90"
        >
          DC
        </button>
      </div>
    </header>
  )
}
