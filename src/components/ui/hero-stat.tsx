import * as React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeroStatProps {
  /** Small label above the big number */
  label: string
  /** The huge number — formatted string, e.g. "$4,200" */
  value: string
  /** Change in the same units as value, e.g. "+$450" */
  change?: string
  /** Percent change, e.g. "+12.5%" */
  changePercent?: string
  /** Time period suffix, e.g. "today", "this month" */
  changeSuffix?: string
  /** Force direction (otherwise inferred from leading sign of change) */
  direction?: 'up' | 'down' | 'neutral'
  className?: string
}

/**
 * HeroStat — portfolio-style giant number with a colored change indicator.
 * The visual centerpiece of any page. Borderless. Big. Bold.
 *
 *   THIS MONTH
 *   $4,200
 *   ↗ +$450 (+12.0%) this month
 */
export function HeroStat({
  label, value, change, changePercent, changeSuffix, direction, className,
}: HeroStatProps) {
  // Infer direction from leading character of change
  const inferred: 'up' | 'down' | 'neutral' =
    direction
    ?? (change?.startsWith('-') ? 'down'
        : change?.startsWith('+') ? 'up'
        : 'neutral')

  const colorClass =
    inferred === 'up' ? 'text-up'
    : inferred === 'down' ? 'text-down'
    : 'text-ink-500'

  const Arrow = inferred === 'down' ? ArrowDownRight : ArrowUpRight

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-ink-500">
        {label}
      </span>
      <p className="hero-num tnum">{value}</p>
      {(change || changePercent) && (
        <div className={cn('flex items-center gap-1.5 text-[14px] font-semibold', colorClass)}>
          {inferred !== 'neutral' && <Arrow className="h-4 w-4" strokeWidth={2.5} />}
          {change && <span>{change}</span>}
          {changePercent && (
            <span className={cn('font-medium', inferred === 'neutral' && 'text-ink-500')}>
              ({changePercent})
            </span>
          )}
          {changeSuffix && (
            <span className="ml-1 text-ink-500 font-medium">{changeSuffix}</span>
          )}
        </div>
      )}
    </div>
  )
}
