import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('transition-all duration-[150ms]', className)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--ink-200)',
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      {...props}
    />
  )
)
Card.displayName = 'Card'

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pb-3', className)} {...props} />
)

export const CardTitle = ({ className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn('', className)}
    style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em', ...style }}
    {...props}
  />
)

export const CardDescription = ({ className, style, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('', className)} style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2, ...style }} {...props} />
)

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
)

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
)
