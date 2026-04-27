import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-[42px] w-full rounded-[10px] px-3.5 text-[13px] bg-soft text-ink-900',
      'border border-ink-100 placeholder:text-ink-400 transition-[border-color,box-shadow] duration-150',
      'focus:outline-none focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/20',
      'disabled:cursor-not-allowed disabled:opacity-40',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'
