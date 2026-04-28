'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button — refined SaaS-app aesthetic. 8px corners, primary uses a subtle
 * mint gradient with a soft shadow for real depth (Linear/Stripe style).
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none',
    'transition-[background,border-color,color,filter,box-shadow] duration-150',
    'focus-visible:outline-none focus-visible:shadow-mint',
    'disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary — gradient mint with subtle shadow
        default:
          'bg-gradient-to-b from-mint-400 to-mint-600 text-page font-semibold shadow-[0_2px_8px_-2px_rgba(94,234,212,0.45)] hover:brightness-110 active:brightness-95',
        // Secondary — filled neutral surface
        secondary:
          'bg-elev text-ink-700 border border-line-strong hover:bg-hover hover:text-ink-900',
        // Outline — hairline border, transparent fill
        outline:
          'bg-transparent text-ink-700 border border-line hover:bg-soft hover:text-ink-900 hover:border-line-strong',
        // Ghost — no chrome until hover
        ghost:
          'bg-transparent text-ink-500 hover:bg-soft hover:text-ink-900',
        // Status variants
        danger:
          'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/40',
        success:
          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/40',
        // Legacy glow alias → primary
        glow:
          'bg-gradient-to-b from-mint-400 to-mint-600 text-page font-semibold shadow-[0_2px_8px_-2px_rgba(94,234,212,0.45)] hover:brightness-110',
      },
      size: {
        sm:        'h-8 px-3 text-[12.5px] rounded-[7px]',
        default:   'h-9 px-3.5 text-[13px] rounded-[8px]',
        lg:        'h-10 px-5 text-[14px] rounded-[8px]',
        icon:      'h-9 w-9 rounded-[8px]',
        'icon-sm': 'h-8 w-8 rounded-[7px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
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
  ),
)
Button.displayName = 'Button'
