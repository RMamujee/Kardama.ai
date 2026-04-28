'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-9 w-full appearance-none rounded-[6px] bg-soft text-ink-900',
        'border border-line pl-3 pr-9 text-[13px]',
        'focus:outline-none focus:border-mint-500',
        'disabled:cursor-not-allowed disabled:opacity-40',
        '[&>option]:bg-card [&>option]:text-ink-900',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
  </div>
))
Select.displayName = 'Select'
