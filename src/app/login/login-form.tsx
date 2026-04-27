'use client'

import { useActionState } from 'react'
import { signInAction, type LoginState } from './actions'

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signInAction, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--ink-700)' }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--ink-200)',
            color: 'var(--ink-900)',
          }}
        />
        {state?.fieldErrors?.email?.map(e => (
          <p key={e} className="text-xs" style={{ color: 'var(--color-rose-500)' }}>{e}</p>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--ink-700)' }}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--ink-200)',
            color: 'var(--ink-900)',
          }}
        />
        {state?.fieldErrors?.password?.map(e => (
          <p key={e} className="text-xs" style={{ color: 'var(--color-rose-500)' }}>{e}</p>
        ))}
      </div>

      {state?.error ? (
        <p className="text-sm" style={{ color: 'var(--color-rose-500)' }}>{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: 'var(--color-violet-500)', color: 'white' }}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
