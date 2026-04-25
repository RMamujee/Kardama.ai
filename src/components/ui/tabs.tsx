'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue { active: string; setActive: (v: string) => void }
const TabsContext = React.createContext<TabsContextValue>({ active: '', setActive: () => {} })

export function Tabs({ defaultValue, onValueChange, children, className }: { defaultValue: string; onValueChange?: (v: string) => void; children: React.ReactNode; className?: string }) {
  const [active, setActive] = React.useState(defaultValue)
  function handleChange(v: string) { setActive(v); onValueChange?.(v) }
  return <TabsContext.Provider value={{ active, setActive: handleChange }}><div className={className}>{children}</div></TabsContext.Provider>
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex gap-1 rounded-lg bg-[#0d1321] border border-[#1e2a3a] p-1', className)}>{children}</div>
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active, setActive } = React.useContext(TabsContext)
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
        active === value
          ? 'bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2537]',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active } = React.useContext(TabsContext)
  if (active !== value) return null
  return <div className={cn('mt-4', className)}>{children}</div>
}
