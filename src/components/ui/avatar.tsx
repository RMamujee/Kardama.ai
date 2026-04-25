import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps { initials: string; color?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }

export function Avatar({ initials, color = '#6366f1', size = 'md', className }: AvatarProps) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
  }
  return (
    <div
      className={cn('flex items-center justify-center rounded-full font-bold text-white ring-2 ring-black/20', sizes[size], className)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
