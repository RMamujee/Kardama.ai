'use client'
import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { usePaymentStore } from '@/store/usePaymentStore'
import { JOBS, CUSTOMERS } from '@/lib/mock-data'

export function LogPaymentModal() {
  const { logModalOpen, closeLogModal, addPayment } = usePaymentStore()
  const [form, setForm] = useState({
    jobId: JOBS.find(j => !j.paid && j.status === 'completed')?.id || JOBS[0].id,
    amount: '',
    method: 'zelle' as 'zelle' | 'venmo' | 'cash',
    note: '',
  })

  const unpaidJobs = JOBS.filter(j => !j.paid || j.status === 'completed')
  const selectedJob = JOBS.find(j => j.id === form.jobId)
  const customer = CUSTOMERS.find(c => c.id === selectedJob?.customerId)

  function handleSubmit() {
    if (!selectedJob) return
    addPayment({
      jobId: form.jobId,
      customerId: selectedJob.customerId,
      cleanerIds: selectedJob.cleanerIds,
      amount: form.amount ? parseFloat(form.amount) : selectedJob.price,
      method: form.method,
      status: 'confirmed',
      confirmationNote: form.note || `${form.method.charAt(0).toUpperCase() + form.method.slice(1)} from ${customer?.name}`,
      receivedAt: new Date().toISOString(),
      month: new Date().toISOString().slice(0, 7),
    })
    closeLogModal()
  }

  return (
    <Dialog open={logModalOpen} onClose={closeLogModal} title="Log Payment">
      <div className="space-y-4">
        <div>
          <Label className="text-ink-700">Job</Label>
          <Select value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))} className="mt-1.5">
            {JOBS.map(j => {
              const c = CUSTOMERS.find(cu => cu.id === j.customerId)
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
            <Select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))} className="mt-1.5">
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
          <Button variant="outline" onClick={closeLogModal}>Cancel</Button>
          <Button onClick={handleSubmit}>Log Payment</Button>
        </div>
      </div>
    </Dialog>
  )
}
