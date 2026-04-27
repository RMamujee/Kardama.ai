'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/supabase/dal'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const InviteSchema = z.object({
  name: z.string().min(2, 'Name required').trim(),
  email: z.string().email('Valid email required').trim(),
  phone: z.string().min(7, 'Phone required').trim(),
  homeArea: z.string().min(2, 'Home area required').trim(),
})

const TEAM_COLORS = ['#8B85F2', '#34D399', '#FBBF24', '#A78BFA', '#2DD4BF', '#F472B6']

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

  // 1. Send Supabase auth invite (creates auth.users row + emails the cleaner an invite link).
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : undefined
  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })
  if (inviteErr || !invite.user) {
    return { error: inviteErr?.message ?? 'Failed to send invite' }
  }

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
    team_id: 'team-a',
    color,
  })
  if (cleanerErr) {
    // Roll back the auth invite if the cleaner insert fails.
    await admin.auth.admin.deleteUser(invite.user.id)
    return { error: `Failed to create cleaner row: ${cleanerErr.message}` }
  }

  // 3. Create profile linking auth user → cleaner row.
  const { error: profileErr } = await admin.from('profiles').insert({
    user_id: invite.user.id,
    role: 'cleaner',
    cleaner_id: cleanerId,
    display_name: name,
  })
  if (profileErr) {
    await admin.from('cleaners').delete().eq('id', cleanerId)
    await admin.auth.admin.deleteUser(invite.user.id)
    return { error: `Failed to create profile: ${profileErr.message}` }
  }

  revalidatePath('/team')
  return { ok: true }
}
