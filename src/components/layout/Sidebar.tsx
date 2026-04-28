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
    <div className="flex h-screen w-[244px] flex-col bg-rail">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-[16px] font-bold text-ink-900 tracking-[-0.015em]">Kardama</div>
          <div className="mt-0.5 text-[11px] text-ink-500 font-medium">Field Service</div>
        </div>
      </div>

      {/* Nav — Spotify-style: bold high-contrast labels, subtle hover */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-6 last:mb-0">
            <p className="px-3 pt-2 pb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-500">
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
                        'group relative flex items-center gap-3 rounded-[6px] px-3 py-[8px] text-[14px] font-bold',
                        'transition-[background-color,color] duration-100',
                        active
                          ? 'bg-hover text-ink-900'
                          : 'text-ink-500 hover:text-ink-900',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] flex-shrink-0',
                          active ? 'text-mint-400' : 'text-ink-500 group-hover:text-ink-900',
                        )}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {badge != null && (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1.5',
                            'text-[10.5px] font-semibold leading-none',
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

      {/* User block — sign-out form */}
      <div className="p-2">
        <form action="/auth/signout" method="post" className="contents">
          <button
            type="submit"
            aria-label="Sign out"
            className="group flex w-full items-center gap-3 rounded-full px-2 py-2 text-left transition-colors hover:bg-hover"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-mint-400 text-[12.5px] font-bold text-black">
              DC
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-ink-900">David Chen</p>
              <p className="truncate text-[11.5px] text-ink-500 mt-0.5">Owner · Long Beach</p>
            </div>
            <LogOut className="mr-2 h-[15px] w-[15px] flex-shrink-0 text-ink-500 transition-colors group-hover:text-ink-900" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-mint-400 shadow-[0_2px_12px_-2px_rgba(0,200,5,0.45)]">
      <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
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
