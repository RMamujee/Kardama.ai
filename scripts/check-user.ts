import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const email = process.argv[2]
if (!email) { console.error('Usage: tsx scripts/check-user.ts <email>'); process.exit(1) }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  const u = list.users.find(x => x.email?.toLowerCase() === email.toLowerCase())
  if (!u) {
    console.log('✗ Not found in auth.users')
    return
  }
  console.log('Found user:')
  console.log('  id:                ', u.id)
  console.log('  email:             ', u.email)
  console.log('  email_confirmed_at:', u.email_confirmed_at ?? '(NOT confirmed)')
  console.log('  banned_until:      ', (u as { banned_until?: string }).banned_until ?? '—')
  console.log('  created_at:        ', u.created_at)
  console.log('  last_sign_in_at:   ', u.last_sign_in_at ?? '(never signed in)')
  console.log('  identities:        ', u.identities?.map(i => i.provider).join(', ') || '(none)')

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', u.id)
    .single()
  console.log('Profile row:        ', profile ?? '(none)')
}

main().catch(e => { console.error(e); process.exit(1) })
