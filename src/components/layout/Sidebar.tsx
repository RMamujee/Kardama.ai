'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Map, DollarSign, Megaphone,
  Users, UserCheck, BarChart3, MessageSquare, Send, Bell, Sparkles, LogOut,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { label: string; href: string; icon: LucideIcon; badge?: number }
type NavSection = { label: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Field Service',
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
    <div className="flex h-screen w-[244px] flex-col bg-rail border-r border-ink-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-[0_4px_12px_rgba(111,105,229,0.35)]">
          <Sparkles className="h-[15px] w-[15px] text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-ink-900 tracking-[-0.01em]">Kardama</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-400">
            AI Field Service
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 pt-2 pb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-400">
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
                        'group flex items-center gap-3 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-colors duration-100',
                        active
                          ? 'bg-violet-500/10 text-violet-400 font-semibold'
                          : 'text-ink-500 hover:bg-hover hover:text-ink-700'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[17px] w-[17px] flex-shrink-0 transition-colors',
                          active ? 'text-violet-400' : 'text-ink-400 group-hover:text-ink-700'
                        )}
                        strokeWidth={1.8}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {badge != null && (
                        <span className="min-w-[18px] rounded-full bg-violet-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
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

      {/* User */}
      <div className="border-t border-ink-200 p-3">
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-hover"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-500/70 text-[12px] font-bold text-page">
            DC
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink-700">David Chen</p>
            <p className="truncate text-[11px] text-ink-400 mt-0.5">Owner · Long Beach</p>
          </div>
          <LogOut className="h-[17px] w-[17px] flex-shrink-0 text-ink-300 transition-colors group-hover:text-ink-500" />
        </button>
      </div>
    </div>
  )
}
