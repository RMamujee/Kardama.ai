import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs } from '@/lib/data'
import { CampaignsClient } from './campaigns-client'

export default async function CampaignsPage() {
  await requireOwner()
  const [customers, cleaners, jobs] = await Promise.all([
    getCustomers(),
    getCleaners(),
    getJobs(),
  ])
  return <CampaignsClient customers={customers} cleaners={cleaners} jobs={jobs} />
}
