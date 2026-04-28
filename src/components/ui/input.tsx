import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input — sharp 6px corners, hairline border. Focus uses the universal
 * mint shadow ring set in globals.css so the experience is consistent
 * across every input + button + interactive element.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-[6px] px-3 text-[13px] bg-soft text-ink-900',
      'border border-line placeholder:text-ink-400',
      'transition-[border-color] duration-100',
      'focus:outline-none focus:border-mint-500',
      'disabled:cursor-not-allowed disabled:opacity-40',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'
