'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { cn } from '@/lib/utils'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — fixed overlay on mobile, in-flow on desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out',
          'md:relative md:z-auto md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="anim-fade-in flex-1 overflow-y-auto bg-page p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
