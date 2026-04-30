import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    available: '#22c55e', 'en-route': '#f59e0b', cleaning: '#3b82f6', 'off-duty': '#94a3b8',
    scheduled: '#3b82f6', confirmed: '#22c55e', 'in-progress': '#f59e0b',
    completed: '#94a3b8', cancelled: '#ef4444',
    pending: '#f59e0b', received: '#3b82f6',
  }
  return map[status] || '#94a3b8'
}

// Short 4-char alphanumeric code derived from the customer ID — deterministic and unique enough
// to disambiguate duplicate names (e.g. two "John Smith" customers).
export function customerCode(id: string): string {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = (((h << 5) + h) ^ id.charCodeAt(i)) >>> 0
  return '#' + (h % 1679616).toString(36).toUpperCase().padStart(4, '0')
}

// Extract customer name from a payment's confirmationNote as a fallback when customer_id is null.
// Intake payments use the format "Intake: Name — service_type".
export function nameFromPaymentNote(note: string): string | null {
  const m = note.match(/^Intake:\s+(.+?)\s+—/)
  return m?.[1] ?? null
}

export function getServiceLabel(type: string): string {
  const map: Record<string, string> = {
    standard: 'Standard Clean', deep: 'Deep Clean', 'move-out': 'Move-Out',
    'post-construction': 'Post-Construction', airbnb: 'Airbnb Turnover'
  }
  return map[type] || type
}
