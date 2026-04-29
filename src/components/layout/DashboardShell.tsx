'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { cn } from '@/lib/utils'

/**
 * DashboardShell — the global frame.
 * No max-width on the main scroll area. Pages decide their own grid.
 * Padding scales with viewport so nothing feels cramped or marooned.
 */
export function DashboardShell({ children, chatListener }: { children: React.ReactNode; chatListener?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-page/85 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — overlay on mobile, in-flow on desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-out',
          'md:relative md:z-auto md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="anim-fade-in flex-1 overflow-y-auto bg-page px-6 py-8 md:px-10 md:py-9 lg:px-14 lg:py-10 xl:px-16">
          {children}
        </main>
      </div>

      {chatListener}
    </div>
  )
}
