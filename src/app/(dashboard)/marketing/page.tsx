import { requireOwner } from '@/lib/supabase/dal'
import { MarketingClient } from './marketing-client'

export default async function MarketingPage() {
  await requireOwner()
  return <MarketingClient />
}
