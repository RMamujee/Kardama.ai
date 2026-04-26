import * as React from 'react'

interface ProgressProps { value: number; className?: string; color?: string }

export function Progress({ value, className, color = 'var(--blue-500)' }: ProgressProps) {
  return (
    <div
      className={className}
      style={{ height: 6, width: '100%', overflow: 'hidden', borderRadius: 99, background: 'var(--bg-elev)' }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: 99,
          background: color,
          width: `${Math.min(100, Math.max(0, value))}%`,
          transition: 'width 700ms',
        }}
      />
    </div>
  )
}
