import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps { value: number; className?: string; color?: string }

export function Progress({ value, className, color = 'bg-indigo-500' }: ProgressProps) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[#1a2537]', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
