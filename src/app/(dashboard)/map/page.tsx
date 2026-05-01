import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getJobs } from '@/lib/data'
import { MapClient } from './map-client'

export default async function MapPage() {
  await requireOwner()
  const [cleaners, allJobs] = await Promise.all([getCleaners(), getJobs()])
  return <MapClient cleaners={cleaners} allJobs={allJobs} />
}
