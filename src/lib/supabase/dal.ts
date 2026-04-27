import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './server'

export type SessionUser = {
  userId: string
  email: string | null
  role: 'owner_operator' | 'cleaner'
  cleanerId: string | null
  displayName: string | null
}

// Verify the user has a Supabase session AND a profile row. Cached per request via React `cache()`.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, cleaner_id, display_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null
  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile.role,
    cleanerId: profile.cleaner_id,
    displayName: profile.display_name,
  }
})

// Use at the top of any protected page/action. Redirects to /login if no session.
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'owner_operator') redirect('/me')
  return user
}

export async function requireCleaner(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'cleaner') redirect('/dashboard')
  return user
}
