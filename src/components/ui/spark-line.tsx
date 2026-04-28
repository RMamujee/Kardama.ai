import * as React from 'react'
import { cn } from '@/lib/utils'

interface SparkLineProps extends React.SVGAttributes<SVGSVGElement> {
  data: number[]
  width?: number
  height?: number
  /** When true, the line is rendered in red (down). Otherwise green (up). */
  down?: boolean
  /** Strict color override (e.g. for neutral / ink) */
  color?: string
  /** Whether to fill the area beneath the line with a faded gradient */
  area?: boolean
  /** Stroke width */
  strokeWidth?: number
}

/**
 * SparkLine — tiny inline trend chart à la Robinhood.
 *
 * Auto-sizes to the data range, renders a smooth polyline, optionally
 * fills the area beneath with a fading gradient (Robinhood watchlist
 * style). Color is automatically green/red based on whether the trend
 * is net up or down.
 */
export function SparkLine({
  data, width = 80, height = 28, down, color, area, strokeWidth = 1.75, className, ...props
}: SparkLineProps) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={cn('block', className)} {...props}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2}
          stroke="var(--color-ink-300)" strokeWidth={strokeWidth} strokeDasharray="2 3" />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1
    const y = height - 2 - ((v - min) / range) * (height - 4)
    return [x, y] as const
  })

  // Decide direction automatically: net change from first to last point
  const isDown = down ?? (data[data.length - 1] < data[0])
  const stroke = color ?? (isDown ? 'var(--color-down)' : 'var(--color-up)')

  const linePath = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`

  const gradId = React.useId()

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('block flex-shrink-0 overflow-visible', className)}
      {...props}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={stroke} stopOpacity={0.32} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      )}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
