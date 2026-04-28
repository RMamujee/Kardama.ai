'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none',
    'transition-[background,border-color,color,transform,box-shadow] duration-150',
    'focus-visible:outline-none focus-visible:shadow-mint',
    'disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-mint-500 text-white shadow-[0_1px_3px_rgba(5,150,105,0.3)] hover:bg-mint-600 active:scale-[0.98]',
        secondary:
          'bg-soft text-ink-700 border border-line-strong hover:bg-hover hover:text-ink-900',
        outline:
          'bg-transparent text-ink-700 border border-line-strong hover:bg-soft hover:text-ink-900',
        ghost:
          'bg-transparent text-ink-500 hover:bg-soft hover:text-ink-900',
        danger:
          'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/18',
        success:
          'bg-mint-500/10 text-mint-500 border border-mint-500/20 hover:bg-mint-500/18',
        glow:
          'bg-mint-500 text-white shadow-[0_1px_3px_rgba(5,150,105,0.3)] hover:bg-mint-600 active:scale-[0.98]',
      },
      size: {
        sm:        'h-8 px-3.5 text-[12.5px] rounded-[7px]',
        default:   'h-9 px-4 text-[13px] rounded-[8px]',
        lg:        'h-10 px-5 text-[13.5px] rounded-[8px]',
        icon:      'h-9 w-9 rounded-[8px]',
        'icon-sm': 'h-8 w-8 rounded-[7px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
