'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { usePaymentStore } from '@/store/usePaymentStore'
import type { Customer, Job } from '@/types'
import type { PaymentMethod } from '@/types/payment'

interface Props {
  customers: Customer[]
  jobs: Job[]
}

export function LogPaymentModal({ customers, jobs }: Props) {
  const router = useRouter()
  const { logModalOpen, closeLogModal, addPayment } = usePaymentStore()
  const unpaidJobs = jobs.filter(j => !j.paid || j.status === 'completed')
  const firstUnpaid = unpaidJobs.find(j => !j.paid && j.status === 'completed') ?? unpaidJobs[0] ?? jobs[0]

  const [form, setForm] = useState({
    jobId: firstUnpaid?.id ?? '',
    amount: '',
    method: 'zelle' as PaymentMethod,
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const selectedJob = jobs.find(j => j.id === form.jobId)
  const customer = customers.find(c => c.id === selectedJob?.customerId)

  async function handleSubmit() {
    if (!selectedJob || !customer) return
    setSubmitting(true)
    const amount = form.amount ? parseFloat(form.amount) : selectedJob.price
    const confirmationNote = form.note || `${form.method.charAt(0).toUpperCase() + form.method.slice(1)} from ${customer.name}`

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: selectedJob.id,
        customerId: selectedJob.customerId,
        cleanerIds: selectedJob.cleanerIds,
        amount,
        method: form.method,
        confirmationNote,
      }),
    })

    if (res.ok) {
      const { payment } = await res.json()
      addPayment({
        id: payment.id,
        jobId: payment.job_id ?? '',
        bookingRef: payment.booking_ref ?? undefined,
        customerId: payment.customer_id,
        cleanerIds: payment.cleaner_ids,
        amount: Number(payment.amount),
        method: payment.method ?? undefined,
        status: payment.status,
        confirmationNote: payment.confirmation_note,
        receivedAt: payment.received_at,
        month: payment.month,
      })
      router.refresh()
    }

    setSubmitting(false)
    closeLogModal()
  }

  return (
    <Dialog open={logModalOpen} onClose={closeLogModal} title="Log Payment">
      <div className="space-y-4">
        <div>
          <Label className="text-ink-700">Job</Label>
          <Select value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))} className="mt-1.5">
            {jobs.map(j => {
              const c = customers.find(cu => cu.id === j.customerId)
              return (
                <option key={j.id} value={j.id}>
                  {c?.name} — {j.address.split(',')[0]} (${j.price})
                </option>
              )
            })}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-ink-700">Amount</Label>
            <Input
              type="number"
              placeholder={selectedJob?.price.toString()}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-ink-700">Method</Label>
            <Select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as PaymentMethod }))} className="mt-1.5">
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="cash">Cash</option>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-ink-700">Confirmation Note</Label>
          <Input
            placeholder="e.g. Zelle from Sarah — Deep clean"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="mt-1.5"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={closeLogModal} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedJob}>
            {submitting ? 'Saving…' : 'Log Payment'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
