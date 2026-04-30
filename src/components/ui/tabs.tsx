'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Tabs — controlled (`value`) or uncontrolled (`defaultValue`). Refined
 * SaaS treatment: sentence-case sans labels, soft surface for active state.
 */
interface TabsContextValue { active: string; setActive: (v: string) => void }
const TabsContext = React.createContext<TabsContextValue>({ active: '', setActive: () => {} })

interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, defaultValue, onValueChange, children, className }: TabsProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue ?? value ?? '')
  const active = isControlled ? value : internal

  const setActive = React.useCallback(
    (v: string) => {
      if (!isControlled) setInternal(v)
      onValueChange?.(v)
    },
    [isControlled, onValueChange],
  )

  return (
    <TabsContext.Provider value={{ active: active ?? '', setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('inline-flex gap-1 rounded-[10px] border border-line bg-soft/40 p-1', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value, children, className,
}: { value: string; children: React.ReactNode; className?: string }) {
  const { active, setActive } = React.useContext(TabsContext)
  const isActive = active === value
  return (
    <button
      type="button"
      onClick={() => setActive(value)}
      className={cn(
        'rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-[background,color] duration-100',
        isActive
          ? 'bg-mint-500/[0.12] text-mint-400 shadow-[0_1px_3px_rgba(0,0,0,0.10)]'
          : 'text-ink-400 hover:text-ink-700',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value, children, className,
}: { value: string; children: React.ReactNode; className?: string }) {
  const { active } = React.useContext(TabsContext)
  if (active !== value) return null
  return <div className={cn('mt-4', className)}>{children}</div>
}
