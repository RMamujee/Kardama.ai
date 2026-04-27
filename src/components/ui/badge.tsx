import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-violet-500/15 text-violet-400',
        success: 'bg-emerald-500/15 text-emerald-500',
        warning: 'bg-amber-500/15 text-amber-500',
        danger:  'bg-rose-500/15 text-rose-500',
        neutral: 'bg-ink-500/15 text-ink-500',
        purple:  'bg-purple-500/15 text-purple-500',
        teal:    'bg-teal-500/15 text-teal-500',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const DOT_COLOR: Record<string, string> = {
  default: 'bg-violet-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  neutral: 'bg-ink-500',
  purple:  'bg-purple-500',
  teal:    'bg-teal-500',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
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
