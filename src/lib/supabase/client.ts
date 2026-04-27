'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Browser client for Client Components — used for live status updates from the cleaner dashboard.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return browserClient
}
