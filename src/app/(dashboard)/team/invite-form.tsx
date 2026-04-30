'use client'

import { useActionState, useEffect, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { inviteCleanerAction, type InviteState } from './actions'

export function InviteCleanerForm() {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [lastOk, setLastOk] = useState(false)

  function handleOpen() {
    setFormKey(k => k + 1)
    setOpen(true)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold"
        style={{ background: 'var(--color-violet-500)', color: 'white' }}
      >
        <UserPlus className="h-4 w-4" /> Invite cleaner
      </button>

      {lastOk ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-emerald-500)' }}>
          Invite sent. The cleaner will receive an email with their login details.
        </p>
      ) : null}

      {open ? (
        <InviteModal
          key={formKey}
          onClose={() => setOpen(false)}
          onSuccess={() => { setOpen(false); setLastOk(true) }}
        />
      ) : null}
    </div>
  )
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteCleanerAction, undefined)

  useEffect(() => {
    if (state?.ok) onSuccess()
  }, [state?.ok])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,32,0.25)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--ink-200)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: 'var(--ink-900)' }}>
            Invite a cleaner
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: 'var(--ink-400)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="flex flex-col gap-3">
          <Field label="Full name" name="name" errors={state?.fieldErrors?.name} />
          <Field label="Email" name="email" type="email" errors={state?.fieldErrors?.email} />
          <Field label="Phone" name="phone" errors={state?.fieldErrors?.phone} />
          <Field label="Home area (e.g. Long Beach)" name="homeArea" errors={state?.fieldErrors?.homeArea} />

          {state?.error ? (
            <p className="text-xs" style={{ color: 'var(--color-rose-500)' }}>{state.error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-violet-500)', color: 'white' }}
          >
            {pending ? 'Sending invite…' : 'Send invite'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label, name, type = 'text', errors,
}: { label: string; name: string; type?: string; errors?: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-medium" style={{ color: 'var(--ink-500)' }}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        className="rounded-lg border px-3 py-2 text-sm"
        style={{
          background: 'var(--bg-soft)',
          borderColor: 'var(--ink-200)',
          color: 'var(--ink-900)',
        }}
      />
      {errors?.map(e => (
        <p key={e} className="text-xs" style={{ color: 'var(--color-rose-500)' }}>{e}</p>
      ))}
    </div>
  )
}
