import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card — the primary surface primitive.
 * Always 1px hairline border, never a drop shadow. Hover lightens the
 * border so the layout never shifts under the cursor.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-card border border-line rounded-[12px]',
        'transition-[border-color,background-color] duration-150',
        'hover:border-line-strong',
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
      'flex items-center justify-between gap-3 px-5 py-4 border-b border-line',
      'sm:px-6',
      className,
    )}
    {...props}
  />
)

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      'text-[14px] font-semibold text-ink-900 tracking-[-0.005em] leading-none',
      className,
    )}
    {...props}
  />
)

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-1 text-[12.5px] text-ink-400', className)} {...props} />
)

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-5 sm:px-6', className)} {...props} />
)

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center px-5 py-4 border-t border-line sm:px-6',
      className,
    )}
    {...props}
  />
)
