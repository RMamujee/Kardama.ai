'use client'
import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

/**
 * Dialog — operations-console treatment. Hairline border, no soft glows.
 * The title bar uses a divider so the form below feels like a real
 * "control sheet" instead of a cute modal.
 */
export function Dialog({ open, onClose, children, title, description, className }: DialogProps) {
  // Lock body scroll while the dialog is open.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-page/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-t-[12px] sm:rounded-[12px]',
          'bg-card border border-line-strong shadow-[0_20px_60px_-8px_rgba(0,0,0,0.14),0_8px_24px_-4px_rgba(0,0,0,0.08)]',
          'animate-in fade-in slide-in-from-bottom-4 duration-200',
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && <h2 className="text-[15px] font-semibold text-ink-900 tracking-[-0.01em]">{title}</h2>}
              {description && <p className="mt-1 text-[12.5px] text-ink-400 leading-[1.45]">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-ink-400 transition-colors hover:bg-soft hover:text-ink-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/** Convenience wrappers — keep dialog-internal sections consistent. */
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-5 sm:px-6', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6',
        className,
      )}
      {...props}
    />
  )
}
