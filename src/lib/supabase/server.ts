import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

// Cookie-based Supabase client for Server Components, Server Actions, and Route Handlers.
// Reads/writes the auth cookies via Next 16's async `cookies()` API.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Calling `set` from a Server Component is a no-op — handled by proxy.ts on the next request.
          }
        },
      },
    },
  )
}

// Anon client for public Route Handlers (e.g. /api/bookings) where we want RLS to apply
// but there is no logged-in cookie. Service role NOT used here.
export function createSupabaseAnonClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll() { return [] }, setAll() {} },
    },
  )
}
