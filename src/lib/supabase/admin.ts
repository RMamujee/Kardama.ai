import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Service-role client. Bypasses RLS — use ONLY for trusted server actions:
// inviting cleaners, seed scripts, admin operations. Never expose this client
// to the browser.
let adminClient: ReturnType<typeof createClient<Database>> | undefined

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    adminClient = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}
