'use client'
import { Bell, Search, Zap } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Dashboard', sub: 'Operations overview' },
  '/scheduling': { title: 'AI Scheduling', sub: 'Smart team assignment' },
  '/map': { title: 'Live Map', sub: 'Real-time operations' },
  '/customers': { title: 'Customers', sub: 'CRM & client management' },
  '/team': { title: 'Team', sub: 'Cleaner management' },
  '/payments': { title: 'Payments', sub: 'Revenue & tracking' },
  '/analytics': { title: 'Analytics', sub: 'Business intelligence' },
  '/marketing': { title: 'Marketing', sub: 'Automation & scheduling' },
  '/inbox': { title: 'Inbox', sub: 'AI-powered messages' },
  '/messages': { title: 'Messages', sub: 'Client communications' },
}

export function Topbar() {
  const pathname = usePathname()
  const info = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] || { title: 'Kardama', sub: '' }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#1e2a3a] bg-[#0a0f1c]/80 backdrop-blur-sm px-6 flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-slate-100">{info.title}</h1>
        {info.sub && <p className="text-xs text-slate-500 -mt-0.5">{info.sub}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* AI Status pill */}
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-400">
          <Zap className="h-3 w-3" />
          AI Active
        </div>

        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
          <Search className="h-4 w-4" />
        </button>

        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500 pulse-glow" />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] cursor-pointer">DC</div>
      </div>
    </header>
  )
}
