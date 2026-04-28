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

/**
 * Sidebar — operations-console treatment.
 * 232px wide. Section headers in mono uppercase. Active item gets a
 * subtle mint fill and a 2px left signal bar. No fancy shadows.
 */
export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-[232px] flex-col bg-rail border-r border-line">
      {/* Brand mark — geometric, not a sparkle */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-ink-900 tracking-[-0.01em]">Kardama</div>
          <div className="grid-label mt-0.5 text-mint-500/80">Field Console</div>
        </div>
      </div>

      {/* Hairline separator under the brand */}
      <div className="mx-5 border-b border-line" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="grid-label px-3 pt-1 pb-2.5">{section.label}</p>
            <ul className="flex flex-col gap-px">
              {section.items.map(({ label, href, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-[6px]',
                        'px-3 py-[7px] text-[13px] font-medium',
                        'transition-[background-color,color] duration-100',
                        active
                          ? 'bg-mint-500/[0.08] text-mint-500'
                          : 'text-ink-500 hover:bg-soft hover:text-ink-700',
                      )}
                    >
                      {/* Left signal bar — only present when active */}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 -translate-x-px rounded-r-full bg-mint-500"
                        />
                      )}
                      <Icon
                        className={cn(
                          'h-[16px] w-[16px] flex-shrink-0',
                          active ? 'text-mint-500' : 'text-ink-400 group-hover:text-ink-600',
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {badge != null && (
                        <span
                          className={cn(
                            'min-w-[18px] rounded-full px-1.5 py-px text-center font-mono',
                            'text-[10px] font-semibold leading-none',
                            active ? 'bg-mint-500 text-page' : 'bg-soft text-ink-500 border border-line',
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

      {/* User block — clicking the LogOut icon submits a real form to /auth/signout */}
      <div className="border-t border-line p-3">
        <form action="/auth/signout" method="post" className="contents">
          <button
            type="submit"
            aria-label="Sign out"
            className="group flex w-full items-center gap-3 rounded-[6px] px-3 py-2.5 text-left transition-colors hover:bg-soft"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] bg-mint-500 font-mono text-[11.5px] font-semibold text-page">
              DC
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink-700">David Chen</p>
              <p className="truncate text-[11px] text-ink-400 mt-0.5">Owner · Long Beach</p>
            </div>
            <LogOut className="h-[15px] w-[15px] flex-shrink-0 text-ink-400 transition-colors group-hover:text-ink-700" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  )
}

/**
 * BrandMark — a geometric tile, not a pre-fab sparkle.
 * 32x32, mint stroke arcs that suggest a "K" + the sweeping motion of cleaning.
 */
function BrandMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-[8px] bg-mint-500">
      <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 4 L6 20 M6 12 L18 4 M9 12 L18 20"
          stroke="#08101F"
          strokeWidth="2.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </div>
  )
}
