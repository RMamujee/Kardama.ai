'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Map, DollarSign, Megaphone,
  Users, UserCheck, BarChart3, MessageSquare, Send, Bell,
  MessagesSquare, LogOut, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/useChatStore'

type NavItem = { label: string; href: string; icon: LucideIcon; badge?: number }
type NavSection = { label: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
      { label: 'Scheduling', href: '/scheduling', icon: CalendarDays },
      { label: 'Live Map',   href: '/map',        icon: Map },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Team',      href: '/team',      icon: UserCheck },
      { label: 'Chats',     href: '/chats',     icon: MessagesSquare },
      { label: 'Payments',  href: '/payments',  icon: DollarSign },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Marketing', href: '/marketing', icon: Megaphone },
      { label: 'Campaigns', href: '/campaigns', icon: Bell },
      { label: 'Inbox',     href: '/inbox',     icon: MessageSquare },
      { label: 'Messages',  href: '/messages',  icon: Send },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const chatUnread = useChatStore(s => s.totalUnread)
  const inboxUnread = useChatStore(s => s.inboxUnread)

  return (
    <div className="flex h-screen w-[240px] flex-col bg-rail border-r border-line">

      {/* Brand */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-ink-900 tracking-[-0.025em]">Kardama</div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
            Field Service
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-6' : ''}>

            {/* Section header with line */}
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                {section.label}
              </span>
              <div className="flex-1 h-px bg-line" />
            </div>

            <ul className="flex flex-col gap-0.5">
              {section.items.map(({ label, href, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                const displayBadge = href === '/chats'
                  ? (chatUnread > 0 ? chatUnread : undefined)
                  : href === '/inbox'
                  ? (inboxUnread > 0 ? inboxUnread : undefined)
                  : badge
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-[7px] px-3 py-2.5',
                        'text-[13px] font-medium overflow-hidden select-none',
                        'transition-all duration-150',
                        active
                          ? 'bg-mint-400/[0.08] text-ink-900 font-semibold'
                          : 'text-ink-500 hover:bg-soft hover:text-ink-700',
                      )}
                    >
                      {/* Left-bar active indicator */}
                      <span
                        className="nav-indicator"
                        style={{ height: active ? '20px' : '0px' }}
                        aria-hidden
                      />

                      <Icon
                        className={cn(
                          'flex-shrink-0 transition-colors duration-150',
                          active
                            ? 'text-mint-400'
                            : 'text-ink-400 group-hover:text-ink-700',
                        )}
                        style={{ width: 15, height: 15 }}
                        strokeWidth={active ? 2.25 : 1.75}
                      />

                      <span className="flex-1 truncate">{label}</span>

                      {displayBadge != null && (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[17px] h-[17px]',
                            'rounded-full px-1 text-[9.5px] font-semibold leading-none',
                            active
                              ? 'bg-mint-400 text-black'
                              : 'bg-red-500 text-white',
                          )}
                        >
                          {displayBadge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User block */}
      <div className="border-t border-line px-3 py-3">
        <form action="/auth/signout" method="post" className="contents">
          <button
            type="submit"
            aria-label="Sign out"
            className="group flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-soft"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-mint-400 text-[11px] font-semibold text-black">
                DC
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-mint-500 border-[2px] border-rail" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-ink-900">David Chen</p>
              <p className="truncate text-[12px] text-ink-500 mt-0.5">Owner · Long Beach</p>
            </div>

            <LogOut
              className="flex-shrink-0 text-ink-400 opacity-50 transition-opacity group-hover:opacity-100"
              style={{ width: 13, height: 13 }}
              strokeWidth={1.75}
            />
          </button>
        </form>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="relative flex-shrink-0" style={{ width: 34, height: 34 }}>
      {/* Gradient border ring */}
      <div
        className="absolute inset-0 rounded-[9px]"
        style={{
          background:
            'linear-gradient(135deg, var(--color-mint-500) 0%, var(--color-mint-400) 55%, var(--color-mint-700) 100%)',
        }}
      />
      {/* Dark interior face */}
      <div
        className="absolute flex items-center justify-center rounded-[7.5px] bg-card"
        style={{ inset: '1.5px' }}
      >
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
          <path
            d="M7 4 L7 20 M7 12 L17 4 M10 12 L17 20"
            stroke="var(--color-mint-400)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
