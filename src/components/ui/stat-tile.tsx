import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'mint' | 'violet' | 'emerald' | 'amber' | 'rose' | 'purple' | 'teal'

const ICON_TONE: Record<Tone, string> = {
  mint:    'bg-mint-500/10 text-mint-500',
  // legacy aliases — all collapse to mint so we don't reintroduce purple
  violet:  'bg-mint-500/10 text-mint-500',
  purple:  'bg-mint-500/10 text-mint-500',
  teal:    'bg-mint-500/10 text-mint-500',
  // status colors stay distinct because they carry meaning
  emerald: 'bg-emerald-500/10 text-emerald-500',
  amber:   'bg-amber-500/10 text-amber-500',
  rose:    'bg-rose-500/10 text-rose-500',
}

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  trend?: React.ReactNode
}

/**
 * StatTile — the KPI primitive. Operations-console treatment:
 *   - Eyebrow label (Mono, uppercase, tracked) at the top
 *   - Big tabular number (Mono) front and center
 *   - Small sub-label below
 *   - Optional icon + trend badge floating top-right
 *   - Thin mint signal line at the very top edge
 */
export function StatTile({
  label, value, sub, icon: Icon, tone = 'mint', trend, className, ...props
}: StatTileProps) {
  return (
    <div className={cn('stat-tile px-5 pt-5 pb-5', className)} {...props}>
      {/* Top row: eyebrow + (icon | trend) */}
      <div className="flex items-start justify-between gap-3">
        <span className="grid-label">{label}</span>
        <div className="flex items-center gap-2">
          {trend}
          {Icon && (
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-[6px]', ICON_TONE[tone])}>
              <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>

      {/* The number — the whole tile is built around this */}
      <p className="num mt-4 text-[34px] font-semibold text-ink-900 leading-none tracking-[-0.025em]">
        {value}
      </p>

      {sub && (
        <p className="mt-3 text-[12px] text-ink-500 truncate">{sub}</p>
      )}
    </div>
  )
}
