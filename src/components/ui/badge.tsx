import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge — operations-style chip. Monospace-uppercase with letter-spacing
 * by default so status reads like a control panel label, not a sticker.
 * Subtle filled background, no rings or glows.
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 px-2 py-[3px]',
    'rounded-[4px] font-mono font-medium uppercase tracking-[0.08em]',
    'text-[10px] leading-none whitespace-nowrap',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-mint-500/10 text-mint-500 border border-mint-500/20',
        success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        danger:  'bg-rose-500/10 text-rose-500 border border-rose-500/20',
        neutral: 'bg-soft text-ink-500 border border-line',
        // Legacy variants — kept so existing pages compile, all map to
        // sensible operations-console treatments.
        purple:  'bg-mint-500/10 text-mint-500 border border-mint-500/20',
        teal:    'bg-mint-500/10 text-mint-500 border border-mint-500/20',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const DOT_COLOR: Record<string, string> = {
  default: 'bg-mint-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  neutral: 'bg-ink-400',
  purple:  'bg-mint-500',
  teal:    'bg-mint-500',
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant = 'default', dot, children, ...props }: BadgeProps) {
  const v = variant ?? 'default'
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn('inline-block h-1.5 w-1.5 rounded-full', DOT_COLOR[v])} />}
      {children}
    </span>
  )
}
