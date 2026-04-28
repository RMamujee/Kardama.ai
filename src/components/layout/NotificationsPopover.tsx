'use client'
import { Bell, CheckCircle2, AlertCircle, MessageSquare, DollarSign, Calendar } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

type Notification = {
  id: string
  icon: React.ElementType
  tone: 'mint' | 'emerald' | 'amber' | 'rose'
  title: string
  body: string
  time: string
  unread: boolean
}

const TONE_BG: Record<Notification['tone'], string> = {
  mint:    'bg-mint-500/10 text-mint-500',
  emerald: 'bg-emerald-500/10 text-emerald-500',
  amber:   'bg-amber-500/10 text-amber-500',
  rose:    'bg-rose-500/10 text-rose-500',
}

// Stub data — replace with a real notifications table when wired up.
const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    icon: DollarSign,
    tone: 'emerald',
    title: 'Payment received',
    body: 'William Foster paid $380 via Zelle.',
    time: '12 min ago',
    unread: true,
  },
  {
    id: 'n2',
    icon: MessageSquare,
    tone: 'mint',
    title: 'New lead',
    body: 'Patricia Nguyen messaged from Long Beach Moms FB group.',
    time: '38 min ago',
    unread: true,
  },
  {
    id: 'n3',
    icon: Calendar,
    tone: 'amber',
    title: 'Schedule conflict',
    body: 'Team Beta has back-to-back jobs with 8 min drive — consider re-ordering.',
    time: '2 h ago',
    unread: false,
  },
  {
    id: 'n4',
    icon: CheckCircle2,
    tone: 'emerald',
    title: 'Booking confirmed',
    body: 'Lisa Thompson booked Friday 11:00 AM via /book/<token> link.',
    time: '5 h ago',
    unread: false,
  },
  {
    id: 'n5',
    icon: AlertCircle,
    tone: 'rose',
    title: 'Twilio not configured',
    body: 'SMS routes returning 503. Set credentials in Vercel env vars.',
    time: 'Yesterday',
    unread: false,
  },
]

export function NotificationsPopover({ children }: { children: React.ReactNode }) {
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[55] w-[380px] rounded-[16px] bg-card shadow-[var(--shadow-pop)] anim-fade-in overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Bell className="h-[15px] w-[15px] text-ink-500" strokeWidth={1.75} />
              <h3 className="text-[13.5px] font-semibold text-ink-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold text-mint-400">{unreadCount} new</span>
              )}
            </div>
            <button
              type="button"
              className="text-[11.5px] font-medium text-ink-400 hover:text-ink-700 transition-colors"
            >
              Mark all read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[440px] overflow-y-auto">
            {NOTIFICATIONS.map((n) => {
              const Icon = n.icon
              return (
                <button
                  key={n.id}
                  type="button"
                  className="group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-soft"
                >
                  {n.unread && (
                    <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-mint-400" aria-hidden />
                  )}
                  <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]', TONE_BG[n.tone])}>
                    <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn(
                        'text-[12.5px] leading-tight',
                        n.unread ? 'font-semibold text-ink-900' : 'font-medium text-ink-700',
                      )}>
                        {n.title}
                      </p>
                      <span className="flex-shrink-0 text-[10.5px] text-ink-400">{n.time}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-[1.45] text-ink-500">{n.body}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="bg-soft/40 px-4 py-2.5">
            <button
              type="button"
              className="w-full text-center text-[12px] font-medium text-ink-500 hover:text-ink-900 transition-colors"
            >
              View all activity
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
