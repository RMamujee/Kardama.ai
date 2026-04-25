import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'text-[11px]',
        success: 'text-[11px]',
        warning: 'text-[11px]',
        danger:  'text-[11px]',
        neutral: 'text-[11px]',
        purple:  'text-[11px]',
        teal:    'text-[11px]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  default: { background: 'rgba(139,133,242,0.15)', color: '#A8A2F7' },
  success: { background: 'rgba(52,211,153,0.14)',  color: '#34D399' },
  warning: { background: 'rgba(251,191,36,0.14)',  color: '#FBBF24' },
  danger:  { background: 'rgba(248,113,113,0.14)', color: '#F87171' },
  neutral: { background: 'rgba(144,153,174,0.12)', color: 'var(--ink-500)' },
  purple:  { background: 'rgba(167,139,250,0.14)', color: '#C4B5FD' },
  teal:    { background: 'rgba(45,212,191,0.14)',  color: '#5EEAD4' },
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant = 'default', dot, style, ...props }: BadgeProps) {
  const v = variant ?? 'default'
  const tokenStyle = BADGE_STYLES[v] ?? BADGE_STYLES.default
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      style={{ ...tokenStyle, ...style }}
      {...props}
    >
      {dot && (
        <span
          className="inline-block rounded-full"
          style={{ width: 5, height: 5, background: tokenStyle.color as string }}
        />
      )}
      {props.children}
    </span>
  )
}
