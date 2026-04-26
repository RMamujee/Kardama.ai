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
    <header
      className="flex flex-shrink-0 items-center gap-3 md:gap-4"
      style={{
        height: 60,
        background: 'var(--bg-page)',
        borderBottom: '1px solid var(--ink-200)',
        padding: '0 16px',
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--ink-400)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-900)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-400)' }}
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0">
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>
          {info.title}
        </h1>
        {info.sub && (
          <p className="hidden sm:block" style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 1 }}>{info.sub}</p>
        )}
      </div>

      <div className="flex-1" />

      {/* AI status pill */}
      <div className="ai-pill hidden sm:inline-flex">
        <span className="pulse" />
        AI Active
      </div>

      {/* Search */}
      <button
        className="flex items-center justify-center transition-colors duration-150"
        style={{
          width: 32, height: 32, borderRadius: 99,
          background: 'var(--bg-elev)',
          border: '1px solid var(--ink-100)',
          cursor: 'pointer',
          color: 'var(--ink-400)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-900)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-400)' }}
      >
        <Search className="h-3.5 w-3.5" />
      </button>

      {/* New button */}
      <button
        className="hidden sm:flex items-center gap-1.5 transition-all duration-150"
        style={{
          height: 32, padding: '0 12px', borderRadius: 8,
          background: 'linear-gradient(180deg, var(--blue-500), var(--blue-600))',
          color: '#fff',
          fontSize: 13, fontWeight: 600,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(111,105,229,0.35)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none' }}
      >
        <Plus className="h-3.5 w-3.5" />
        New
      </button>

      {/* Notifications */}
      <button
        className="relative flex items-center justify-center transition-colors duration-150"
        style={{
          width: 32, height: 32, borderRadius: 99,
          background: 'var(--bg-elev)',
          border: '1px solid var(--ink-100)',
          cursor: 'pointer',
          color: 'var(--ink-400)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-900)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-400)' }}
      >
        <Bell className="h-3.5 w-3.5" />
        <span
          className="absolute"
          style={{
            top: 7, right: 8, width: 6, height: 6,
            background: 'var(--blue-500)', borderRadius: 99,
          }}
        />
      </button>

      {/* Avatar */}
      <div
        className="flex cursor-pointer items-center justify-center rounded-full font-bold"
        style={{
          width: 32, height: 32, fontSize: 11.5,
          background: 'linear-gradient(135deg, #34D399, #10B981)',
          color: 'var(--bg-page)',
          flexShrink: 0,
        }}
      >
        DC
      </div>
    </header>
  )
}
