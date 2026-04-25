'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps { children: React.ReactNode; content: string; side?: 'top' | 'bottom' | 'left' | 'right' }

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)
  const positionClass = { top: 'bottom-full left-1/2 -translate-x-1/2 mb-2', bottom: 'top-full left-1/2 -translate-x-1/2 mt-2', left: 'right-full top-1/2 -translate-y-1/2 mr-2', right: 'left-full top-1/2 -translate-y-1/2 ml-2' }[side]
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={cn('absolute z-50 whitespace-nowrap rounded-lg bg-[#1a2537] border border-[#1e2a3a] px-2.5 py-1.5 text-xs text-slate-200 shadow-lg pointer-events-none', positionClass)}>
          {content}
        </div>
      )}
    </div>
  )
}
