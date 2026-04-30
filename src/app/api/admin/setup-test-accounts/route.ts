import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/setup-test-accounts
// Creates auth users for the two test personas:
//   owner:   owner@kardama.test  / Test1234!
//   cleaner: cleaner@kardama.test / Test1234!  (linked to cleaner c1)
//
// Safe to call multiple times — skips existing users.
// Requires SUPABASE_SERVICE_ROLE_KEY. Not protected by auth so it can bootstrap itself.

const TEST_PASSWORD = 'Test1234!'

const TEST_ACCOUNTS = [
  {
    email: 'owner@kardama.test',
    role: 'owner_operator' as const,
    displayName: 'Test Owner',
    cleanerId: null,
  },
  {
    email: 'cleaner@kardama.test',
    role: 'cleaner' as const,
    displayName: 'Test Cleaner (Bigfoot 1)',
    cleanerId: 'c1',
  },
]

export async function POST(request: Request) {
  // Guard: only allow if SETUP_SECRET header matches env var, or no secret is configured
  const secret = process.env.SETUP_SECRET
  if (secret) {
    const provided = request.headers.get('x-setup-secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const admin = getSupabaseAdminClient()
  const results: Array<{ email: string; status: string }> = []

  for (const account of TEST_ACCOUNTS) {
    // Check if auth user already exists
    const { data: existing } = await admin.auth.admin.listUsers()
    const existingUser = existing?.users?.find(u => u.email === account.email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      results.push({ email: account.email, status: 'auth user already exists' })
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: account.email,
        password: TEST_PASSWORD,
        email_confirm: true,
      })
      if (error || !created.user) {
        results.push({ email: account.email, status: `ERROR creating auth user: ${error?.message}` })
        continue
      }
      userId = created.user.id
      results.push({ email: account.email, status: 'auth user created' })
    }

    // Upsert profile row
    const { error: profileError } = await admin.from('profiles').upsert({
      user_id: userId,
      role: account.role,
      display_name: account.displayName,
      cleaner_id: account.cleanerId,
    }, { onConflict: 'user_id' })

    if (profileError) {
      results.push({ email: account.email, status: `ERROR upserting profile: ${profileError.message}` })
    } else {
      results.push({ email: account.email, status: `profile upserted (${account.role})` })
    }
  }

  return NextResponse.json({
    results,
    credentials: {
      owner:   { email: 'owner@kardama.test',   password: TEST_PASSWORD, path: '/dashboard' },
      cleaner: { email: 'cleaner@kardama.test', password: TEST_PASSWORD, path: '/me' },
    },
  })
}
