import { Phone, MapPin, Clock, Navigation } from 'lucide-react'
import { requireCleaner } from '@/lib/supabase/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { updateMyStatus, updateJobStatus } from './actions'
import { LocationTracker } from './LocationTracker'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  'in-progress': 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'var(--ink-400)',
  confirmed: 'var(--color-violet-500)',
  'in-progress': 'var(--color-amber-500)',
  completed: 'var(--color-emerald-500)',
  cancelled: 'var(--color-rose-500)',
}

const CLEANER_STATUSES = ['available', 'en-route', 'cleaning', 'off-duty'] as const

export default async function CleanerHomePage() {
  const user = await requireCleaner()
  const supabase = await createSupabaseServerClient()
  const today = new Date().toISOString().slice(0, 10)

  // RLS automatically filters jobs to ones this cleaner is assigned to.
  const [{ data: jobs }, { data: cleaner }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, scheduled_date, scheduled_time, address, notes, status, service_type, estimated_duration, customer_id')
      .eq('scheduled_date', today)
      .order('scheduled_time'),
    user.cleanerId
      ? supabase.from('cleaners').select('status, name').eq('id', user.cleanerId).single()
      : Promise.resolve({ data: null }),
  ])

  // Fetch customer details for jobs (RLS lets us see customers we have a job for).
  const customerIds = Array.from(new Set((jobs ?? []).map(j => j.customer_id)))
  const { data: customers } = customerIds.length
    ? await supabase.from('customers').select('id, name, phone').in('id', customerIds)
    : { data: [] }
  const customerById = new Map((customers ?? []).map(c => [c.id, c]))

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <LocationTracker />

      <section
        className="rounded-2xl border p-4"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--ink-100)' }}
      >
        <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--ink-400)' }}>
          My status
        </p>
        <form action={updateMyStatus} className="grid grid-cols-2 gap-2">
          {CLEANER_STATUSES.map(s => {
            const active = cleaner?.status === s
            return (
              <button
                key={s}
                type="submit"
                name="status"
                value={s}
                className="rounded-lg px-3 py-2 text-sm font-medium capitalize"
                style={{
                  background: active ? 'var(--color-violet-500)' : 'var(--bg-soft)',
                  color: active ? 'white' : 'var(--ink-700)',
                }}
              >
                {s.replace('-', ' ')}
              </button>
            )
          })}
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink-700)' }}>
          {jobs?.length ?? 0} {jobs?.length === 1 ? 'job' : 'jobs'} today
        </h2>

        {(jobs ?? []).length === 0 ? (
          <div
            className="rounded-2xl border p-6 text-center text-sm"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--ink-100)', color: 'var(--ink-400)' }}
          >
            No jobs scheduled for today.
          </div>
        ) : (
          (jobs ?? []).map(job => {
            const customer = customerById.get(job.customer_id)
            const next = nextStatus(job.status)
            return (
              <article
                key={job.id}
                className="rounded-2xl border p-4"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--ink-100)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold" style={{ color: 'var(--ink-900)' }}>
                      {customer?.name ?? 'Customer'}
                    </p>
                    <p className="mt-0.5 text-xs capitalize" style={{ color: 'var(--ink-500)' }}>
                      {job.service_type.replace('-', ' ')} · {job.estimated_duration} min
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: 'var(--bg-soft)',
                      color: STATUS_COLOR[job.status] ?? 'var(--ink-500)',
                    }}
                  >
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--ink-500)' }}>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{fmtTime(job.scheduled_time)}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="break-words">{job.address}</span>
                    </div>
                    <div className="flex gap-2 pl-[22px]">
                      <a
                        href={`https://maps.apple.com/?daddr=${encodeURIComponent(job.address)}&dirflg=d`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: 'var(--bg-soft)', color: 'var(--ink-700)' }}
                      >
                        <Navigation className="h-3 w-3" />
                        Apple Maps
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: 'var(--bg-soft)', color: 'var(--ink-700)' }}
                      >
                        <Navigation className="h-3 w-3" />
                        Google Maps
                      </a>
                    </div>
                  </div>
                  {customer?.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      className="flex items-center gap-2"
                      style={{ color: 'var(--color-violet-400)' }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>{customer.phone}</span>
                    </a>
                  ) : null}
                  {job.notes ? (
                    <p className="mt-1" style={{ color: 'var(--ink-400)' }}>
                      Note: {job.notes}
                    </p>
                  ) : null}
                </div>

                {next ? (
                  <form action={updateJobStatus} className="mt-3">
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="status" value={next.value} />
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-2 text-sm font-semibold"
                      style={{ background: 'var(--color-violet-500)', color: 'white' }}
                    >
                      {next.label}
                    </button>
                  </form>
                ) : null}
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function nextStatus(status: string): { value: string; label: string } | null {
  if (status === 'scheduled' || status === 'confirmed') return { value: 'in-progress', label: 'Start job' }
  if (status === 'in-progress') return { value: 'completed', label: 'Mark complete' }
  return null
}
