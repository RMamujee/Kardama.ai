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

export function getServiceLabel(type: string): string {
  const map: Record<string, string> = {
    standard: 'Standard Clean', deep: 'Deep Clean', 'move-out': 'Move-Out',
    'post-construction': 'Post-Construction', airbnb: 'Airbnb Turnover'
  }
  return map[type] || type
}
