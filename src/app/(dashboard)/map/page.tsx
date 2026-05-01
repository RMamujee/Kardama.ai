import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getJobs, getCustomers } from '@/lib/data'
import { MapClient } from './map-client'

export default async function MapPage() {
  await requireOwner()
  const [cleaners, allJobs, customers] = await Promise.all([getCleaners(), getJobs(), getCustomers()])
  return <MapClient cleaners={cleaners} allJobs={allJobs} customers={customers} />
}
