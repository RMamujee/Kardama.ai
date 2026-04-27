'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap',
    'transition-[background,border-color,filter,box-shadow] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-page',
    'disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        default:   'bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,_0_4px_14px_rgba(111,105,229,0.35)] hover:brightness-110',
        secondary: 'bg-elev text-ink-700 border border-ink-100 hover:bg-hover hover:text-ink-900',
        outline:   'bg-transparent text-ink-700 border border-ink-100 hover:bg-hover hover:text-ink-900',
        ghost:     'bg-transparent text-ink-500 hover:bg-hover hover:text-ink-900',
        danger:    'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/15',
        success:   'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15',
        glow:      'bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-[0_4px_24px_rgba(139,133,242,0.4)] hover:brightness-110',
      },
      size: {
        sm:        'h-8 px-3 text-[12px] rounded-lg',
        default:   'h-10 px-4 text-[13px] rounded-[10px]',
        lg:        'h-11 px-6 text-[14px] rounded-[10px]',
        icon:      'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'
