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
          'bg-mint-400 text-black shadow-[0_2px_14px_-3px_rgba(29,185,84,0.5)] hover:bg-mint-500 hover:scale-[1.03] active:scale-[0.97]',
        secondary:
          'bg-soft text-ink-700 border border-line-strong hover:bg-hover hover:text-ink-900',
        outline:
          'bg-transparent text-ink-700 border border-line-strong hover:bg-soft hover:text-ink-900',
        ghost:
          'bg-transparent text-ink-500 hover:bg-soft hover:text-ink-900',
        danger:
          'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/[0.15]',
        success:
          'bg-mint-500/10 text-mint-500 border border-mint-500/20 hover:bg-mint-500/[0.15]',
        glow:
          'bg-mint-400 text-black shadow-[0_2px_14px_-3px_rgba(29,185,84,0.5)] hover:bg-mint-500 hover:scale-[1.03] active:scale-[0.97]',
      },
      size: {
        sm:        'h-8 px-3.5 text-[12.5px] rounded-[6px]',
        default:   'h-9 px-4 text-[13px] rounded-[7px]',
        lg:        'h-10 px-5 text-[13.5px] rounded-[7px]',
        icon:      'h-9 w-9 rounded-[7px]',
        'icon-sm': 'h-8 w-8 rounded-[6px]',
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
