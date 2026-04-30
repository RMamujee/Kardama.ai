import { requireOwner } from '@/lib/supabase/dal'
import { getSocialLeads } from '@/lib/data'
import { InboxClient } from './inbox-client'

export default async function InboxPage() {
  await requireOwner()
  const leads = await getSocialLeads()
  return <InboxClient leads={leads} />
}
