/**
 * Hard reset: delete the existing auth user (which cascades the profile),
 * then recreate via signUp() so the email identity is properly attached.
 *
 * Usage:
 *   npm run db:reset-owner -- --email you@x.com --password yourpass [--name N]
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

function parseArgs() {
  const args = process.argv.slice(2)
  const out: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const k = args[i]
    if (k.startsWith('--')) {
      const key = k.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) { out[key] = next; i++ } else out[key] = 'true'
    }
  }
  return out
}

async function main() {
  const args = parseArgs()
  const email = args.email
  const password = args.password
  const displayName = args.name ?? 'Owner'
  if (!email || !password) {
    console.error('Usage: npm run db:reset-owner -- --email you@x.com --password yourpass [--name N]')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const admin = createClient(url, service, { auth: { persistSession: false } })
  const anonClient = createClient(url, anon, { auth: { persistSession: false } })

  // 1. Delete existing user if present (cascades profile via FK).
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) throw listErr
  const existing = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    console.log(`▶ Deleting existing user ${existing.id}…`)
    const { error } = await admin.auth.admin.deleteUser(existing.id)
    if (error) throw error
  }

  // 2. Recreate via signUp() — this path properly creates the email identity.
  console.log(`▶ Signing up ${email}…`)
  const { data: signUp, error: signUpErr } = await anonClient.auth.signUp({ email, password })
  if (signUpErr) throw signUpErr
  const userId = signUp.user?.id
  if (!userId) throw new Error('signUp returned no user id')
  console.log(`  ↳ Created user, id=${userId}`)

  // 3. Mark email as confirmed via admin (skips the verify-email click).
  console.log('▶ Confirming email via admin…')
  const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })
  if (confirmErr) throw confirmErr

  // 4. Insert / upsert the profile row.
  console.log('▶ Upserting owner profile…')
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert({ user_id: userId, role: 'owner_operator', display_name: displayName, cleaner_id: null })
  if (profileErr) throw profileErr

  // 5. Smoke test the login.
  console.log('▶ Smoke-testing signInWithPassword…')
  const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password })
  if (signInErr) {
    console.error(`  ✗ Login still failing: ${signInErr.message}`)
    process.exit(1)
  }
  console.log(`  ✓ Login works. Session token issued for user ${signIn.user?.id}`)
  console.log()
  console.log('✓ Done. You can log in at /login with:')
  console.log(`    email:    ${email}`)
  console.log(`    password: ${password}`)
}

main().catch(e => { console.error('✗ reset-owner failed:', e); process.exit(1) })
