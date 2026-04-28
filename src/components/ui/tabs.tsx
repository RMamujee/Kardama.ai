'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Tabs — supports both controlled (`value`) and uncontrolled (`defaultValue`)
 * modes. Operations-console treatment: monospace labels, mint active fill,
 * 6px corners, no glow.
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
    <div className={cn('inline-flex gap-1 rounded-[6px] border border-line bg-soft p-1', className)}>
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
        'rounded-[4px] px-3 py-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] transition-colors',
        isActive
          ? 'bg-mint-500 text-page'
          : 'text-ink-500 hover:bg-hover hover:text-ink-900',
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
