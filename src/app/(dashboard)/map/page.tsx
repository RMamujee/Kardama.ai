import { requireOwner } from '@/lib/supabase/dal'
import { MapClient } from './map-client'

export default async function MapPage() {
  await requireOwner()
  return <MapClient />
}
