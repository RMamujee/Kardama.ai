'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button — Spotify-inspired. Primary actions are pill-shaped solid green
 * with a slight scale-up on hover (the same micro-interaction Spotify uses
 * on its Play / Subscribe / Save buttons). Secondary actions stay
 * rectangular so they don't compete.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none',
    'transition-[background,border-color,color,transform,box-shadow,filter] duration-150',
    'focus-visible:outline-none focus-visible:shadow-mint',
    'disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary — Spotify green pill, hover scale + brightness
        default:
          'bg-mint-500 text-black shadow-[0_2px_12px_-2px_rgba(30,215,96,0.35)] hover:bg-mint-400 hover:scale-[1.04] active:scale-[0.98]',
        // Secondary — filled neutral
        secondary:
          'bg-elev text-ink-700 border border-line-strong hover:bg-hover hover:text-ink-900',
        // Outline — Spotify-style ghost button with subtle border
        outline:
          'bg-transparent text-ink-700 border border-ink-300/40 hover:border-ink-700 hover:text-ink-900 hover:scale-[1.04]',
        // Ghost — text-only nav-style
        ghost:
          'bg-transparent text-ink-500 hover:bg-soft hover:text-ink-900',
        // Status variants
        danger:
          'bg-rose-500/12 text-rose-500 border border-rose-500/25 hover:bg-rose-500/20',
        success:
          'bg-mint-500/12 text-mint-500 border border-mint-500/25 hover:bg-mint-500/20',
        // Legacy glow alias → primary
        glow:
          'bg-mint-500 text-black shadow-[0_2px_12px_-2px_rgba(30,215,96,0.35)] hover:bg-mint-400 hover:scale-[1.04]',
      },
      size: {
        sm:        'h-8 px-3.5 text-[12.5px] rounded-full',
        default:   'h-10 px-5 text-[13.5px] rounded-full',
        lg:        'h-11 px-7 text-[14px] rounded-full',
        icon:      'h-9 w-9 rounded-full',
        'icon-sm': 'h-8 w-8 rounded-full',
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
