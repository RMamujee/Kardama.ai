'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCleaner } from '@/lib/supabase/dal'

const StatusSchema = z.enum(['available', 'en-route', 'cleaning', 'off-duty'])
const JobStatusSchema = z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'])

export async function updateMyStatus(formData: FormData) {
  const user = await requireCleaner()
  if (!user.cleanerId) return

  const parsed = StatusSchema.safeParse(formData.get('status'))
  if (!parsed.success) return

  const supabase = await createSupabaseServerClient()
  // RLS guarantees the cleaner can only update their own row.
  await supabase.from('cleaners').update({ status: parsed.data }).eq('id', user.cleanerId)
  revalidatePath('/me')
}

export async function updateJobStatus(formData: FormData) {
  await requireCleaner()
  const jobId = formData.get('jobId')
  const parsed = JobStatusSchema.safeParse(formData.get('status'))
  if (!parsed.success || typeof jobId !== 'string') return

  const supabase = await createSupabaseServerClient()
  // RLS only allows updates to jobs where this cleaner is in cleaner_ids.
  await supabase.from('jobs').update({ status: parsed.data }).eq('id', jobId)
  revalidatePath('/me')
}
