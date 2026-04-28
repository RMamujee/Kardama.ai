import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card — Robinhood-style: borderless, surface defined by background color
 * contrast against the pure-black canvas. No shadows.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-card rounded-[16px]', className)}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6 sm:pt-6',
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
  <div className={cn('px-5 pb-5 sm:px-6 sm:pb-6', className)} {...props} />
)

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center px-5 pb-5 sm:px-6 sm:pb-6', className)} {...props} />
)
