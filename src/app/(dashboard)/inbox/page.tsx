import { requireOwner } from '@/lib/supabase/dal'
import { InboxClient } from './inbox-client'

export default async function InboxPage() {
  await requireOwner()
  return <InboxClient />
}
