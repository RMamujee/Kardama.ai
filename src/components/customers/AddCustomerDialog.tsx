'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { addCustomer, type AddCustomerInput } from '@/app/actions/customers'

interface Props {
  open: boolean
  onClose: () => void
}

const SOURCES: { value: AddCustomerInput['source']; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'yelp',     label: 'Yelp' },
  { value: 'referral', label: 'Referral' },
  { value: 'text',     label: 'Text / direct' },
  { value: 'repeat',   label: 'Returning customer' },
]

export function AddCustomerDialog({ open, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [topError, setTopError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setTopError(null)
    const fd = new FormData(e.currentTarget)
    const input: AddCustomerInput = {
      name:    String(fd.get('name')    ?? '').trim(),
      phone:   String(fd.get('phone')   ?? '').trim(),
      email:   String(fd.get('email')   ?? '').trim(),
      address: String(fd.get('address') ?? '').trim(),
      city:    String(fd.get('city')    ?? '').trim(),
      source:  fd.get('source') as AddCustomerInput['source'],
      notes:   String(fd.get('notes') ?? '').trim() || '',
    }

    startTransition(async () => {
      const result = await addCustomer(input)
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        setTopError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New customer"
      description="They'll show up in the customer list immediately. The address is geocoded automatically so the live map can route to them."
    >
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          {topError && (
            <div className="rounded-[6px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-500">
              {topError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name}>
              <Input name="name" placeholder="Jane Doe" autoComplete="off" required />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input name="phone" type="tel" placeholder="(562) 555-0100" autoComplete="off" required />
            </Field>
          </div>

          <Field label="Email" error={errors.email}>
            <Input name="email" type="email" placeholder="jane@example.com" autoComplete="off" required />
          </Field>

          <Field label="Street address" error={errors.address} hint="Geocoded via OpenStreetMap.">
            <Input name="address" placeholder="1234 Ocean Blvd, Long Beach, CA 90802" autoComplete="off" required />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="City" error={errors.city}>
              <Input name="city" placeholder="Long Beach" autoComplete="off" required />
            </Field>
            <Field label="Source" error={errors.source}>
              <Select name="source" defaultValue="referral">
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Notes" error={errors.notes} hint="Optional. Visible on the customer card.">
            <textarea
              name="notes"
              rows={3}
              maxLength={500}
              placeholder="Has a dog. Prefers afternoon slots."
              className="flex w-full resize-none rounded-[6px] border border-line bg-soft px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-mint-500 focus:outline-none"
            />
          </Field>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isPending ? 'Adding…' : 'Add customer'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function Field({
  label, error, hint, children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[11.5px] text-ink-400 font-medium">{label}</Label>
      {children}
      {error && <p className="mt-1 text-[11.5px] text-rose-500">{error}</p>}
      {!error && hint && <p className="mt-1 text-[11.5px] text-ink-400">{hint}</p>}
    </div>
  )
}
