'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  {
    variants: {
      variant: {
        default:   '',
        secondary: '',
        outline:   '',
        ghost:     '',
        danger:    '',
        success:   '',
        glow:      '',
      },
      size: {
        sm:      'h-8 px-3 text-[12.5px] rounded-lg',
        default: 'h-10 px-4 text-[13.5px] rounded-[10px]',
        lg:      'h-11 px-6 text-[14.5px] rounded-[10px]',
        icon:    'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  default: {
    background: 'linear-gradient(180deg, var(--blue-500), var(--blue-600))',
    color: '#fff',
    boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(111,105,229,0.35)',
    border: 'none',
  },
  secondary: {
    background: 'var(--bg-elev)',
    color: 'var(--ink-700)',
    border: '1px solid var(--ink-100)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--ink-700)',
    border: '1px solid var(--ink-100)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink-500)',
    border: 'none',
  },
  danger: {
    background: 'rgba(248,113,113,0.1)',
    color: '#F87171',
    border: '1px solid rgba(248,113,113,0.2)',
  },
  success: {
    background: 'rgba(52,211,153,0.1)',
    color: '#34D399',
    border: '1px solid rgba(52,211,153,0.2)',
  },
  glow: {
    background: 'linear-gradient(135deg, var(--blue-500), var(--violet-500))',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 24px rgba(139,133,242,0.4)',
  },
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size, style, ...props }, ref) => {
    const v = variant ?? 'default'
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={{ ...VARIANT_STYLES[v], ...style }}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
