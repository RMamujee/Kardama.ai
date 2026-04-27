import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in — Kardama' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg-page)' }}>
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--ink-200)' }}
      >
        <div className="mb-6 flex flex-col items-center gap-1.5">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--ink-900)' }}>
            Kardama
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-500)' }}>
            Sign in to your dashboard
          </p>
        </div>
        <LoginForm next={next} />
      </div>
    </div>
  )
}
