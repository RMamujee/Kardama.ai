import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getJobs, getTeams } from '@/lib/data'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  await requireOwner()
  const [cleaners, jobs, teams] = await Promise.all([getCleaners(), getJobs(), getTeams()])
  return <TeamClient cleaners={cleaners} jobs={jobs} teams={teams} />
}
