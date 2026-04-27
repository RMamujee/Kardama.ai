import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'violet' | 'emerald' | 'amber' | 'rose' | 'purple' | 'teal'

const ICON_TONE: Record<Tone, string> = {
  violet:  'bg-violet-500/15 text-violet-400',
  emerald: 'bg-emerald-500/15 text-emerald-500',
  amber:   'bg-amber-500/15 text-amber-500',
  rose:    'bg-rose-500/15 text-rose-500',
  purple:  'bg-purple-500/15 text-purple-500',
  teal:    'bg-teal-500/15 text-teal-500',
}

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  trend?: React.ReactNode
}

export function StatTile({
  label, value, sub, icon: Icon, tone = 'violet', trend, className, ...props
}: StatTileProps) {
  return (
    <div className={cn('stat-tile p-5 sm:p-6', className)} {...props}>
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', ICON_TONE[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        {trend}
      </div>
      <p className="text-[12px] font-medium text-ink-400 mb-1.5 tnum">{label}</p>
      <p className="text-[28px] sm:text-[30px] font-bold text-ink-900 leading-[1.1] tracking-[-0.02em] tnum mb-1.5">
        {value}
      </p>
      {sub && <p className="text-[12px] text-ink-500">{sub}</p>}
    </div>
  )
}
