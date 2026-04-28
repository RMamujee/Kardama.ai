'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button — sharper than the previous design. 6px radius, no soft glows,
 * primary uses solid mint with high contrast against the dark canvas.
 *
 * Default = mint primary. Use `secondary` / `outline` / `ghost` for
 * everything that isn't the most important action on screen.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,opacity] duration-100',
    'focus-visible:outline-none focus-visible:shadow-mint',
    'disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary action — mint on dark. Bold, unmissable.
        default:
          'bg-mint-500 text-page hover:bg-mint-400 active:bg-mint-600 font-semibold',
        // Secondary action — filled neutral surface
        secondary:
          'bg-elev text-ink-700 border border-line hover:bg-hover hover:text-ink-900 hover:border-line-strong',
        // Outline — hairline border, transparent fill
        outline:
          'bg-transparent text-ink-700 border border-line hover:bg-soft hover:text-ink-900 hover:border-line-strong',
        // Ghost — no chrome until hover
        ghost:
          'bg-transparent text-ink-500 hover:bg-soft hover:text-ink-900',
        // Status variants — keep the chip aesthetic
        danger:
          'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/40',
        success:
          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/40',
        // The legacy "glow" variant maps to the same mint primary —
        // existing pages calling variant="glow" still get the brand color
        // but lose the eye-watering shadow.
        glow:
          'bg-mint-500 text-page hover:bg-mint-400 font-semibold',
      },
      size: {
        sm:        'h-7 px-2.5 text-[12px] rounded-[6px]',
        default:   'h-9 px-3.5 text-[12.5px] rounded-[6px]',
        lg:        'h-10 px-5 text-[13.5px] rounded-[6px]',
        icon:      'h-9 w-9 rounded-[6px]',
        'icon-sm': 'h-7 w-7 rounded-[6px]',
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
