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
        'h-[42px] w-full appearance-none rounded-[10px] border border-[#1e2a3a] bg-[#0d1321] pl-3.5 pr-9 text-[13.5px] text-slate-100 shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
        'disabled:cursor-not-allowed disabled:opacity-40',
        '[&>option]:bg-[#111827] [&>option]:text-slate-100',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
  </div>
))
Select.displayName = 'Select'
