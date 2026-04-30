import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/apply-schema
// Applies all data-level setup in one shot:
//   1. Renames cleaners to Cleaner 1-10
//   2. Upserts the 5 teams
//   3. Wires cleaners to their teams
//   4. Creates owner + cleaner test accounts
//
// Schema DDL (tables, enums, columns) must still be run in the Supabase
// SQL editor — see supabase/apply.sql in the repo.
//
// Safe to call multiple times. No secret required in dev; set SETUP_SECRET
// env var to protect in production.

const TEST_PASSWORD = 'Test1234!'

const CLEANERS = [
  { id: 'c1',  name: 'Cleaner 1',  initials: 'C1',  email: 'cleaner1@kardama.ai',  teamId: 'team-a' },
  { id: 'c2',  name: 'Cleaner 2',  initials: 'C2',  email: 'cleaner2@kardama.ai',  teamId: 'team-a' },
  { id: 'c3',  name: 'Cleaner 3',  initials: 'C3',  email: 'cleaner3@kardama.ai',  teamId: 'team-b' },
  { id: 'c4',  name: 'Cleaner 4',  initials: 'C4',  email: 'cleaner4@kardama.ai',  teamId: 'team-b' },
  { id: 'c5',  name: 'Cleaner 5',  initials: 'C5',  email: 'cleaner5@kardama.ai',  teamId: 'team-c' },
  { id: 'c6',  name: 'Cleaner 6',  initials: 'C6',  email: 'cleaner6@kardama.ai',  teamId: 'team-c' },
  { id: 'c7',  name: 'Cleaner 7',  initials: 'C7',  email: 'cleaner7@kardama.ai',  teamId: 'team-d' },
  { id: 'c8',  name: 'Cleaner 8',  initials: 'C8',  email: 'cleaner8@kardama.ai',  teamId: 'team-d' },
  { id: 'c9',  name: 'Cleaner 9',  initials: 'C9',  email: 'cleaner9@kardama.ai',  teamId: 'team-e' },
  { id: 'c10', name: 'Cleaner 10', initials: 'C10', email: 'cleaner10@kardama.ai', teamId: 'team-e' },
]

const TEAMS = [
  { id: 'team-a', name: 'Team A', color: '#5EEAD4' },
  { id: 'team-b', name: 'Team B', color: '#34D399' },
  { id: 'team-c', name: 'Team C', color: '#FBBF24' },
  { id: 'team-d', name: 'Team D', color: '#60A5FA' },
  { id: 'team-e', name: 'Team E', color: '#A78BFA' },
]

const TEST_ACCOUNTS = [
  { email: 'owner@kardama.test',   role: 'owner_operator' as const, displayName: 'Test Owner',   cleanerId: null },
  { email: 'cleaner@kardama.test', role: 'cleaner' as const,        displayName: 'Test Cleaner', cleanerId: 'c1' },
]

export async function POST(request: Request) {
  const secret = process.env.SETUP_SECRET
  if (secret) {
    if (request.headers.get('x-setup-secret') !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const admin = getSupabaseAdminClient()
  const log: string[] = []

  // ── 1. Upsert teams ──────────────────────────────────────────────
  const { error: teamsErr } = await admin.from('teams').upsert(
    TEAMS.map(t => ({ ...t, archived: false })),
    { onConflict: 'id' }
  )
  if (teamsErr) log.push(`teams upsert ERROR: ${teamsErr.message}`)
  else log.push(`teams: upserted ${TEAMS.length} rows`)

  // ── 2. Rename cleaners + wire team_id ────────────────────────────
  let cleanerOk = 0
  for (const c of CLEANERS) {
    const { error } = await admin.from('cleaners').update({
      name: c.name,
      initials: c.initials,
      email: c.email,
      team_id: c.teamId,
    }).eq('id', c.id)
    if (error) log.push(`cleaner ${c.id} ERROR: ${error.message}`)
    else cleanerOk++
  }
  log.push(`cleaners: updated ${cleanerOk}/${CLEANERS.length}`)

  // ── 3. Test auth accounts ────────────────────────────────────────
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  for (const account of TEST_ACCOUNTS) {
    const existing = existingUsers?.users?.find(u => u.email === account.email)
    let userId: string

    if (existing) {
      userId = existing.id
      log.push(`${account.email}: auth user already exists`)
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: account.email,
        password: TEST_PASSWORD,
        email_confirm: true,
      })
      if (error || !created.user) {
        log.push(`${account.email}: ERROR creating auth user — ${error?.message}`)
        continue
      }
      userId = created.user.id
      log.push(`${account.email}: auth user created`)
    }

    const { error: profileErr } = await admin.from('profiles').upsert({
      user_id: userId,
      role: account.role,
      display_name: account.displayName,
      cleaner_id: account.cleanerId,
    }, { onConflict: 'user_id' })

    if (profileErr) log.push(`${account.email}: profile ERROR — ${profileErr.message}`)
    else log.push(`${account.email}: profile upserted (${account.role})`)
  }

  return NextResponse.json({
    ok: true,
    log,
    credentials: {
      owner:   { email: 'owner@kardama.test',   password: TEST_PASSWORD, path: '/dashboard' },
      cleaner: { email: 'cleaner@kardama.test', password: TEST_PASSWORD, path: '/me' },
    },
    nextStep: 'If schema DDL is not yet applied, run supabase/apply.sql in the Supabase SQL editor.',
  })
}
