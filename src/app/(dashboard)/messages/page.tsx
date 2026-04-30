import { requireOwner } from '@/lib/supabase/dal'
import { getCleaners, getCustomers, getJobs, getAllMessages } from '@/lib/data'
import { ChatClient } from './chat-client'
import { MessagesClient } from './messages-client'
import { Suspense } from 'react'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  await requireOwner()
  const { view } = await searchParams
  const isSms = view === 'sms'

  if (isSms) {
    const [jobs, customers, cleaners] = await Promise.all([
      getJobs(),
      getCustomers(),
      getCleaners(),
    ])
    return <MessagesClient jobs={jobs} customers={customers} cleaners={cleaners} />
  }

  const [cleaners, messages] = await Promise.all([
    getCleaners(),
    getAllMessages(),
  ])

  return (
    <Suspense>
      <ChatClient cleaners={cleaners} initialMessages={messages} />
    </Suspense>
  )
}
