/**
 * Creates an owner_operator account so the dashboard is reachable.
 *
 * Run: npm run db:create-owner -- --email you@example.com --password yourpass
 *
 * Uses the Supabase admin API (service role) to:
 *   1. Create or find an auth.users row with the given email
 *   2. Insert a profiles row tying that user to role='owner_operator'
 *
 * Idempotent — re-running with the same email is safe.
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
      if (next && !next.startsWith('--')) {
        out[key] = next
        i++
      } else {
        out[key] = 'true'
      }
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
    console.error('Usage: npm run db:create-owner -- --email you@example.com --password yourpass [--name "Your Name"]')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`▶ Looking for existing user "${email}"…`)

  // Find existing user (admin.listUsers paginates; for a fresh project this is fine)
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) throw listErr
  let userId = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id

  if (userId) {
    console.log(`  ↳ Found existing user, id=${userId}. Updating password.`)
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password })
    if (updErr) throw updErr
  } else {
    console.log(`  ↳ Not found. Creating new user.`)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // skip the email-verification step
    })
    if (createErr) throw createErr
    userId = created.user!.id
    console.log(`  ↳ Created, id=${userId}`)
  }

  console.log('▶ Upserting owner profile…')
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert({ user_id: userId, role: 'owner_operator', display_name: displayName, cleaner_id: null })
  if (profileErr) throw profileErr

  console.log()
  console.log('✓ Done.')
  console.log(`  Login at /login with:`)
  console.log(`    email:    ${email}`)
  console.log(`    password: ${password}`)
}

main().catch(err => {
  console.error('✗ create-owner failed:', err)
  process.exit(1)
})
