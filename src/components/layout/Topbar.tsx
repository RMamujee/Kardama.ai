'use client'
import { Bell, Menu, Search, Plus } from 'lucide-react'
import { usePathname } from 'next/navigation'

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':  { title: 'Dashboard',     sub: 'Saturday, April 25 · Long Beach' },
  '/scheduling': { title: 'AI Scheduling', sub: 'Smart team assignment' },
  '/map':        { title: 'Live Map',      sub: 'Real-time crew & route view' },
  '/customers':  { title: 'Customers',     sub: 'CRM & client management' },
  '/team':       { title: 'Team',          sub: 'Cleaner management' },
  '/payments':   { title: 'Payments',      sub: 'Revenue & tracking' },
  '/analytics':  { title: 'Analytics',     sub: 'Business intelligence' },
  '/marketing':  { title: 'Marketing',     sub: 'Automation & scheduling' },
  '/campaigns':  { title: 'Campaigns',     sub: '3-week nurturing & booking links' },
  '/inbox':      { title: 'Inbox',         sub: '2 unread · 1 needs reply' },
  '/messages':   { title: 'Messages',      sub: 'Client communications' },
}

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname()
  const info = Object.entries(PAGE_META).find(([k]) => pathname.startsWith(k))?.[1]
            ?? { title: 'Kardama', sub: '' }

  return (
    <header className="flex h-[64px] flex-shrink-0 items-center gap-3 border-b border-ink-200 bg-page px-4 sm:gap-4 sm:px-6">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-hover hover:text-ink-900 md:hidden"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      <div className="min-w-0">
        <h1 className="truncate text-[18px] font-bold text-ink-900 tracking-[-0.015em] leading-tight">
          {info.title}
        </h1>
        {info.sub && (
          <p className="hidden sm:block text-[12px] text-ink-400 mt-0.5 truncate">{info.sub}</p>
        )}
      </div>

      <div className="flex-1" />

      {/* AI status */}
      <div className="ai-pill hidden md:inline-flex">
        <span className="pulse" />
        AI Active
      </div>

      <button
        type="button"
        aria-label="Search"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-elev border border-ink-100 text-ink-400 transition-colors hover:text-ink-900 hover:border-ink-200"
      >
        <Search className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="hidden h-9 items-center gap-2 rounded-[10px] bg-gradient-to-b from-violet-500 to-violet-600 px-4 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,_0_4px_14px_rgba(111,105,229,0.35)] transition-[filter] hover:brightness-110 sm:inline-flex"
      >
        <Plus className="h-4 w-4" />
        New
      </button>

      <button
        type="button"
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-elev border border-ink-100 text-ink-400 transition-colors hover:text-ink-900 hover:border-ink-200"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute top-2 right-2 h-[7px] w-[7px] rounded-full bg-violet-500 ring-2 ring-page" />
      </button>

      <div
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-500/70 text-[12px] font-bold text-page"
        aria-label="Account"
        role="button"
      >
        DC
      </div>
    </header>
  )
}
