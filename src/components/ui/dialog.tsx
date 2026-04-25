'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps { open: boolean; onClose: () => void; children: React.ReactNode; title?: string; description?: string }

export function Dialog({ open, onClose, children, title, description }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#111827] border border-[#1e2a3a] shadow-[0_24px_80px_rgba(0,0,0,0.8)] p-6">
        {(title || description) && (
          <div className="mb-5">
            <div className="flex items-start justify-between">
              {title && <h2 className="text-lg font-semibold text-slate-100">{title}</h2>}
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-200 hover:bg-[#1a2537] transition-colors ml-4">
                <X className="h-4 w-4" />
              </button>
            </div>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
