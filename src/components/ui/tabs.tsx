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
  return (
    <div
      className={cn('flex gap-1 rounded-[10px] p-1', className)}
      style={{ background: 'var(--bg-soft)', border: '1px solid var(--ink-100)' }}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active, setActive } = React.useContext(TabsContext)
  const isActive = active === value
  return (
    <button
      onClick={() => setActive(value)}
      className={cn('flex-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150', className)}
      style={{
        background: isActive ? 'linear-gradient(180deg, var(--blue-500), var(--blue-600))' : 'transparent',
        color: isActive ? '#fff' : 'var(--ink-500)',
        boxShadow: isActive ? '0 2px 8px rgba(139,133,242,0.3)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'var(--ink-700)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' } }}
      onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'var(--ink-500)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
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
