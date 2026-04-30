'use client'

import { useActionState, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createTeamAction, type CreateTeamState } from './actions'

const PRESET_COLORS = [
  '#5EEAD4', '#34D399', '#FBBF24', '#60A5FA',
  '#A78BFA', '#F472B6', '#FB923C', '#22D3EE',
]

export function CreateTeamForm() {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [state, action, pending] = useActionState<CreateTeamState, FormData>(createTeamAction, undefined)

  if (state?.ok && open) {
    setOpen(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold"
        style={{ background: 'var(--bg-soft)', color: 'var(--ink-900)', border: '1px solid var(--ink-200)' }}
      >
        <Plus className="h-4 w-4" /> New team
      </button>

      {state?.ok ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-emerald-500)' }}>
          Team created.
        </p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,26,32,0.25)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--ink-200)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--ink-900)' }}>
                Create a team
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ color: 'var(--ink-400)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={action} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="name" className="text-xs font-medium" style={{ color: 'var(--ink-500)' }}>
                  Team name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Team Zeta"
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: 'var(--bg-soft)',
                    borderColor: 'var(--ink-200)',
                    color: 'var(--ink-900)',
                  }}
                />
                {state?.fieldErrors?.name?.map(e => (
                  <p key={e} className="text-xs" style={{ color: 'var(--color-rose-500)' }}>{e}</p>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-500)' }}>
                  Color
                </label>
                <input type="hidden" name="color" value={color} />
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Pick ${c}`}
                      className="h-7 w-7 rounded-full border-2 transition-transform"
                      style={{
                        background: c,
                        borderColor: color === c ? 'var(--ink-900)' : 'transparent',
                        transform: color === c ? 'scale(1.1)' : undefined,
                      }}
                    />
                  ))}
                </div>
                {state?.fieldErrors?.color?.map(e => (
                  <p key={e} className="text-xs" style={{ color: 'var(--color-rose-500)' }}>{e}</p>
                ))}
              </div>

              {state?.error ? (
                <p className="text-xs" style={{ color: 'var(--color-rose-500)' }}>{state.error}</p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--color-violet-500)', color: 'white' }}
              >
                {pending ? 'Creating…' : 'Create team'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
