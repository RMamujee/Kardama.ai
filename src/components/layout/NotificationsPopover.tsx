'use client'
import { Bell, MessagesSquare } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/useChatStore'

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return `${Math.floor(hrs / 24)} d ago`
}

export function NotificationsPopover({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { notifications: chatNotifs, markAllRead } = useChatStore()

  const chatUnread = chatNotifs.filter(n => !n.read).length
  const totalUnread = chatUnread

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[55] w-[380px] rounded-[14px] border border-line-strong bg-card shadow-[var(--shadow-pop)] anim-fade-in overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Bell className="h-[15px] w-[15px] text-ink-500" strokeWidth={1.75} />
              <h3 className="text-[13.5px] font-semibold text-ink-900">Notifications</h3>
              {totalUnread > 0 && (
                <span className="text-[11px] font-semibold text-mint-500">{totalUnread} new</span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-[12.5px] font-medium text-ink-500 hover:text-ink-700 transition-colors"
            >
              Mark all read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[440px] overflow-y-auto">

            {/* Live chat notifications */}
            {chatNotifs.map(n => (
              <Popover.Close asChild key={n.id}>
                <button
                  type="button"
                  onClick={() => router.push('/chats')}
                  className="group relative flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-soft"
                >
                  {!n.read && (
                    <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-mint-500" aria-hidden />
                  )}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-mint-500/10 text-mint-500">
                    <MessagesSquare className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn('text-[12.5px] leading-tight', !n.read ? 'font-semibold text-ink-900' : 'font-medium text-ink-700')}>
                        {n.cleanerName}
                      </p>
                      <span className="flex-shrink-0 text-[12px] text-ink-500">{relativeTime(n.time)}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-[1.45] text-ink-500 truncate">{n.message}</p>
                  </div>
                </button>
              </Popover.Close>
            ))}

            {chatNotifs.length === 0 && (
              <p className="px-4 py-8 text-center text-[13px] text-ink-400">No notifications</p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line bg-soft/40 px-4 py-2.5">
            <Popover.Close asChild>
              <button
                type="button"
                onClick={() => router.push('/chats')}
                className="w-full text-center text-[12px] font-medium text-ink-500 hover:text-ink-900 transition-colors"
              >
                View all chats
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
