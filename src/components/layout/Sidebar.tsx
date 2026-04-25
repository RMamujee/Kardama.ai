'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Map, DollarSign, Megaphone,
  Users, UserCheck, BarChart3, MessageSquare, Send, Bell, Sparkles, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_SECTIONS = [
  {
    label: 'AI Field Service',
    items: [
      { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
      { label: 'Scheduling', href: '/scheduling', icon: CalendarDays },
      { label: 'Live Map',   href: '/map',        icon: Map },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Team',      href: '/team',      icon: UserCheck },
      { label: 'Payments',  href: '/payments',  icon: DollarSign },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Analytics',  href: '/analytics',  icon: BarChart3 },
      { label: 'Marketing',  href: '/marketing',  icon: Megaphone },
      { label: 'Campaigns',  href: '/campaigns',  icon: Bell },
      { label: 'Inbox',      href: '/inbox',      icon: MessageSquare, badge: 2 },
      { label: 'Messages',   href: '/messages',   icon: Send },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div
      className="flex h-screen flex-shrink-0 flex-col"
      style={{
        width: 220,
        background: 'var(--bg-rail)',
        borderRight: '1px solid var(--ink-100)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4" style={{ padding: '18px 16px 14px' }}>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, var(--blue-500), var(--blue-700))' }}
        >
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink-900)' }}>
            Kardama
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--blue-400)', fontWeight: 600, marginTop: -1, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            AI Field Service
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '0 8px' }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 12 }}>
            <p
              style={{
                padding: '8px 12px 6px',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--ink-400)',
                textTransform: 'uppercase',
              }}
            >
              {section.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map(({ label, href, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-lg transition-all duration-[120ms]',
                    )}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      background: active ? 'var(--blue-50)' : 'transparent',
                      color: active ? 'var(--blue-400)' : 'var(--ink-500)',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-700)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-500)'
                      }
                    }}
                  >
                    <Icon
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: active ? 'var(--blue-400)' : 'var(--ink-400)', strokeWidth: 1.8 }}
                    />
                    <span className="flex-1">{label}</span>
                    {badge != null && (
                      <span
                        style={{
                          background: 'var(--blue-500)',
                          color: '#fff',
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 99,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div style={{ borderTop: '1px solid var(--ink-100)', padding: 12 }}>
        <div
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
          style={{ borderRadius: 8 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: 'linear-gradient(135deg, #34D399, #10B981)', color: 'var(--bg-page)' }}
          >
            DC
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }} className="truncate">David Chen</p>
            <p style={{ fontSize: 11, color: 'var(--ink-400)' }} className="truncate">Owner · Long Beach</p>
          </div>
          <LogOut className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ink-300)' }} />
        </div>
      </div>
    </div>
  )
}
