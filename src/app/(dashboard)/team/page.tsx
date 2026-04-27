import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getJobs } from '@/lib/data'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  await requireOwner()
  const [cleaners, jobs] = await Promise.all([getCleaners(), getJobs()])
  return <TeamClient cleaners={cleaners} jobs={jobs} />
}
