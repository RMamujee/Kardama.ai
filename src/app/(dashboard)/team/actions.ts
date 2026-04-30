'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/supabase/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const InviteSchema = z.object({
  name: z.string().min(2, 'Name required').trim(),
  email: z.string().email('Valid email required').trim(),
  phone: z.string().min(7, 'Phone required').trim(),
  homeArea: z.string().min(2, 'Home area required').trim(),
})

const TEAM_COLORS = ['#8B85F2', '#34D399', '#FBBF24', '#A78BFA', '#2DD4BF', '#F472B6']

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

export type InviteState = {
  ok?: boolean
  error?: string
  fieldErrors?: { name?: string[]; email?: string[]; phone?: string[]; homeArea?: string[] }
} | undefined

export async function inviteCleanerAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  await requireOwner()

  const parsed = InviteSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    homeArea: formData.get('homeArea'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const { name, email, phone, homeArea } = parsed.data

  const admin = getSupabaseAdminClient()
  const mobileUrl = process.env.NEXT_PUBLIC_MOBILE_APP_URL ?? 'https://kardama-mobile.vercel.app'

  const tempPassword = generateTempPassword()

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { needs_password_setup: true },
  })
  if (createErr || !newUser.user) {
    return { error: createErr?.message ?? 'Failed to create cleaner account' }
  }
  const userId = newUser.user.id

  // 2. Create the cleaner row.
  const cleanerId = `c_${Date.now().toString(36)}`
  const initials = name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const color = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]
  const { error: cleanerErr } = await admin.from('cleaners').insert({
    id: cleanerId,
    name,
    initials,
    phone,
    email,
    rating: 0,
    total_jobs: 0,
    current_lat: 0,
    current_lng: 0,
    home_area_name: homeArea,
    home_area_lat: 0,
    home_area_lng: 0,
    status: 'off-duty',
    available_hours: {},
    specialties: ['standard'],
    reliability_score: 0,
    current_job_id: null,
    team_id: null,
    color,
  })
  if (cleanerErr) {
    await admin.auth.admin.deleteUser(userId)
    return { error: `Failed to create cleaner row: ${cleanerErr.message}` }
  }

  // 3. Create profile linking auth user → cleaner row.
  const { error: profileErr } = await admin.from('profiles').insert({
    user_id: userId,
    role: 'cleaner',
    cleaner_id: cleanerId,
    display_name: name,
  })
  if (profileErr) {
    await admin.from('cleaners').delete().eq('id', cleanerId)
    await admin.auth.admin.deleteUser(userId)
    return { error: `Failed to create profile: ${profileErr.message}` }
  }

  // 4. Optional: fire n8n webhook for CRM / branded follow-up notifications.
  const n8nWelcomeWebhook = process.env.N8N_CLEANER_WELCOME_WEBHOOK_URL
  if (n8nWelcomeWebhook) {
    fetch(n8nWelcomeWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerName: name,
        cleanerEmail: email,
        cleanerPhone: phone,
        mobileAppUrl: mobileUrl,
        tempPassword,
      }),
    }).catch(e => console.error('n8n cleaner welcome webhook failed:', e))
  }

  revalidatePath('/team')
  return { ok: true }
}

// ─────────────── Create team ───────────────
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

const TeamSchema = z.object({
  name: z.string().min(2, 'Name required').max(40, 'Name too long').trim(),
  color: z.string().regex(HEX_COLOR_RE, 'Color must be a #RRGGBB hex value'),
})

export type CreateTeamState = {
  ok?: boolean
  error?: string
  fieldErrors?: { name?: string[]; color?: string[] }
} | undefined

function slugifyTeamName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return slug ? `team-${slug}` : `team-${Date.now().toString(36)}`
}

export async function createTeamAction(
  _prev: CreateTeamState,
  formData: FormData,
): Promise<CreateTeamState> {
  await requireOwner()

  const parsed = TeamSchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }
  const { name, color } = parsed.data

  const supabase = await createSupabaseServerClient()
  const id = slugifyTeamName(name)

  const { error } = await supabase.from('teams').insert({ id, name, color })
  if (error) {
    if (error.code === '23505') {
      return { fieldErrors: { name: ['A team with that name already exists'] } }
    }
    return { error: error.message }
  }

  revalidatePath('/team')
  return { ok: true }
}

// ─────────────── Delete cleaner ───────────────

export async function deleteCleanerAction(cleanerId: string): Promise<{ error?: string }> {
  await requireOwner()

  const admin = getSupabaseAdminClient()

  // Look up the auth user via the profile row
  const { data: profile } = await admin
    .from('profiles')
    .select('user_id')
    .eq('cleaner_id', cleanerId)
    .maybeSingle()

  // Delete auth user (cascades to profile row)
  if (profile?.user_id) {
    await admin.auth.admin.deleteUser(profile.user_id)
  }

  // Delete cleaner row
  const { error } = await admin.from('cleaners').delete().eq('id', cleanerId)
  if (error) return { error: error.message }

  revalidatePath('/team')
  return {}
}
