import { LogOut } from 'lucide-react'
import { requireCleaner } from '@/lib/supabase/dal'

export default async function CleanerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCleaner()
  const initials = (user.displayName ?? user.email ?? '??')
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-page">
      <header
        className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4"
        style={{ background: 'var(--bg-page)', borderColor: 'var(--ink-100)' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
          style={{ background: 'var(--color-emerald-500)', color: 'var(--bg-page)' }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
            {user.displayName ?? user.email}
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-400)' }}>Today's jobs</p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ color: 'var(--ink-400)' }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </header>
      <main className="p-4 pb-24">{children}</main>
    </div>
  )
}
