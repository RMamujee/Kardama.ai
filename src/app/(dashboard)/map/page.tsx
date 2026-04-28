import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getTodayJobs } from '@/lib/data'
import { MapClient } from './map-client'

export default async function MapPage() {
  await requireOwner()
  const [cleaners, todayJobs] = await Promise.all([getCleaners(), getTodayJobs()])
  return <MapClient cleaners={cleaners} todayJobs={todayJobs} />
}
