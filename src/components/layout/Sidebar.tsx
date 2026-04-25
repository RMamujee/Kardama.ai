'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Map, DollarSign, Megaphone,
  Users, UserCheck, BarChart3, MessageSquare, Send, Sparkles, LogOut, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Scheduling', href: '/scheduling', icon: CalendarDays },
      { label: 'Live Map', href: '/map', icon: Map },
    ]
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Team', href: '/team', icon: UserCheck },
      { label: 'Payments', href: '/payments', icon: DollarSign },
    ]
  },
  {
    label: 'GROWTH',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Marketing', href: '/marketing', icon: Megaphone },
      { label: 'Inbox', href: '/inbox', icon: MessageSquare },
      { label: 'Messages', href: '/messages', icon: Send },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col bg-[#0a0f1c] border-r border-[#1e2a3a] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1e2a3a]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_12px_rgba(99,102,241,0.4)]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-base font-bold text-white tracking-tight">Kardama</span>
          <div className="text-[10px] text-indigo-400 font-medium -mt-0.5">AI Field Service</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-indigo-500/12 text-indigo-400 shadow-[inset_2px_0_0_#6366f1]'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0 transition-colors', active ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-300')} />
                    <span className="flex-1">{label}</span>
                    {active && <ChevronRight className="h-3 w-3 text-indigo-500 opacity-60" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-[#1e2a3a] p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]">DC</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">David Chen</p>
            <p className="text-xs text-slate-500 truncate">Owner · Long Beach</p>
          </div>
          <LogOut className="h-4 w-4 text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}
