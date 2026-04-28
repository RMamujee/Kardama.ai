'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Map, DollarSign, Megaphone,
  Users, UserCheck, BarChart3, MessageSquare, Send, Bell,
  LogOut, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
      { label: 'Payments',  href: '/payments',  icon: DollarSign },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Marketing', href: '/marketing', icon: Megaphone },
      { label: 'Campaigns', href: '/campaigns', icon: Bell },
      { label: 'Inbox',     href: '/inbox',     icon: MessageSquare, badge: 2 },
      { label: 'Messages',  href: '/messages',  icon: Send },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-[244px] flex-col bg-rail border-r border-line">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-4">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-ink-900 tracking-[-0.02em]">Kardama</div>
          <div className="mt-0.5 text-[11px] text-ink-400 font-medium">Field Service</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="px-3 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map(({ label, href, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-[7px] px-3 py-[7px] text-[13.5px] font-medium',
                        'transition-[background-color,color] duration-100',
                        active
                          ? 'bg-hover text-ink-900 font-semibold'
                          : 'text-ink-500 hover:bg-soft hover:text-ink-900',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[16px] w-[16px] flex-shrink-0',
                          active ? 'text-mint-400' : 'text-ink-500 group-hover:text-ink-900',
                        )}
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {badge != null && (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1.5',
                            'text-[10px] font-semibold leading-none',
                            active
                              ? 'bg-mint-400 text-black'
                              : 'bg-elev text-ink-500',
                          )}
                        >
                          {badge}
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
      <div className="border-t border-line p-3">
        <form action="/auth/signout" method="post" className="contents">
          <button
            type="submit"
            aria-label="Sign out"
            className="group flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-soft"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-mint-400 text-[12px] font-bold text-black">
              DC
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink-900">David Chen</p>
              <p className="truncate text-[11px] text-ink-400 mt-0.5">Owner · Long Beach</p>
            </div>
            <LogOut className="h-[14px] w-[14px] flex-shrink-0 text-ink-400 transition-colors group-hover:text-ink-600" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center rounded-[8px] bg-mint-400 shadow-[0_2px_8px_-2px_rgba(29,185,84,0.5)]">
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none">
        <path
          d="M7 4 L7 20 M7 12 L17 4 M10 12 L17 20"
          stroke="#000"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
