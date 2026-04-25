import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, style, ...props }, ref) => (
  <input
    className={cn(
      'flex h-[38px] w-full rounded-[10px] px-3 py-1 text-[13px] shadow-sm transition-all duration-150',
      'placeholder:text-[var(--ink-400)]',
      'focus-visible:outline-none',
      'disabled:cursor-not-allowed disabled:opacity-40',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className
    )}
    style={{
      background: 'var(--bg-soft)',
      border: '1px solid var(--ink-100)',
      color: 'var(--ink-900)',
      ...style,
    }}
    onFocus={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue-500)'
      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--blue-50)'
      props.onFocus?.(e)
    }}
    onBlur={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-100)'
      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      props.onBlur?.(e)
    }}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'
