import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card — Spotify-style with visible border. The border restores clear
 * separation between blocks so dense data doesn't run together.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-card border border-line-strong rounded-[14px]',
        'transition-[border-color] duration-200',
        'hover:border-[#4A4A4F]',
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 px-5 py-4 border-b border-line sm:px-6',
      className,
    )}
    {...props}
  />
)

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn('text-[15px] font-bold text-ink-900 tracking-[-0.015em] leading-none', className)}
    {...props}
  />
)

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-1 text-[12.5px] text-ink-500 font-medium', className)} {...props} />
)

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-5 sm:px-6', className)} {...props} />
)

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center px-5 py-4 border-t border-line sm:px-6', className)} {...props} />
)
