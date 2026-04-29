import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'mint' | 'violet' | 'emerald' | 'amber' | 'rose' | 'purple' | 'teal'

const ICON_TONE: Record<Tone, string> = {
  mint:    'bg-mint-500/12 text-mint-500',
  violet:  'bg-mint-500/12 text-mint-500',
  purple:  'bg-mint-500/12 text-mint-500',
  teal:    'bg-mint-500/12 text-mint-500',
  emerald: 'bg-emerald-500/12 text-emerald-500',
  amber:   'bg-amber-500/12 text-amber-500',
  rose:    'bg-rose-500/12 text-rose-500',
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
 * StatTile — refined KPI block. Sans label + headline number, no monospace
 * dominance. Subtle mint signal line appears at top on hover (set in
 * globals.css via .stat-tile::before).
 */
export function StatTile({
  label, value, sub, icon: Icon, tone = 'mint', trend, className, ...props
}: StatTileProps) {
  return (
    <div className={cn('stat-tile px-6 py-6', className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-500">{label}</span>
        <div className="flex items-center gap-2">
          {trend}
          {Icon && (
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-[8px]', ICON_TONE[tone])}>
              <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>

      <p className="num mt-4 text-[32px] font-bold text-ink-900 leading-none tracking-[-0.03em]">
        {value}
      </p>

      {sub && (
        <p className="mt-3 text-[12.5px] text-ink-500 truncate font-medium">{sub}</p>
      )}
    </div>
  )
}
