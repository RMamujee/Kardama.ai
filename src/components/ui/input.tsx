import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input — refined SaaS aesthetic. 8px corners, hairline border, soft
 * filled background. Focus uses the universal mint shadow ring.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-[8px] px-3 text-[13px] bg-soft/60 text-ink-900',
      'border border-line placeholder:text-ink-400',
      'transition-[border-color,background-color] duration-100',
      'hover:bg-soft hover:border-line-strong',
      'focus:outline-none focus:border-mint-500 focus:bg-soft',
      'disabled:cursor-not-allowed disabled:opacity-40',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'
