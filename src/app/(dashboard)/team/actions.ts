'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
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

  // 1. Generate invite link without letting Supabase send its generic email.
  //    generateLink creates the auth.users row and returns the magic link so we
  //    can send our own branded onboarding email instead.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${mobileUrl}/auth/callback` },
  })
  if (linkErr || !linkData.user) {
    return { error: linkErr?.message ?? 'Failed to generate invite link' }
  }
  const inviteUrl = linkData.properties.action_link

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
    await admin.auth.admin.deleteUser(linkData.user.id)
    return { error: `Failed to create cleaner row: ${cleanerErr.message}` }
  }

  // 3. Create profile linking auth user → cleaner row.
  const { error: profileErr } = await admin.from('profiles').insert({
    user_id: linkData.user.id,
    role: 'cleaner',
    cleaner_id: cleanerId,
    display_name: name,
  })
  if (profileErr) {
    await admin.from('cleaners').delete().eq('id', cleanerId)
    await admin.auth.admin.deleteUser(linkData.user.id)
    return { error: `Failed to create profile: ${profileErr.message}` }
  }

  // 4. Send branded onboarding email via Resend.
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Kardama <onboarding@kardama.ai>'
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `You're invited to join Kardama`,
      html: buildOnboardingEmail({ name, email, mobileUrl, inviteUrl }),
    }).catch(e => console.error('Resend onboarding email failed:', e))
  } else {
    console.warn('RESEND_API_KEY not set — onboarding email not sent for', email)
  }

  revalidatePath('/team')
  return { ok: true }
}

function buildOnboardingEmail({ name, email, mobileUrl, inviteUrl }: {
  name: string; email: string; mobileUrl: string; inviteUrl: string
}) {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Kardama</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#0a0f0b;padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:#1ED760;border-radius:8px;display:inline-block;vertical-align:middle;"></div>
            <span style="color:#ffffff;font-size:22px;font-weight:700;vertical-align:middle;letter-spacing:-0.5px;">Kardama</span>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0a0f0b;letter-spacing:-0.5px;">Welcome, ${firstName}!</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
            You've been added to the Kardama cleaning team. Use the button below to set your password and activate your account — it only takes a minute.
          </p>

          <!-- CTA -->
          <div style="text-align:center;margin:0 0 32px;">
            <a href="${inviteUrl}" style="display:inline-block;background:#1ED760;color:#000000;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;">
              Set Up My Account
            </a>
          </div>

          <!-- Details box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
            <tr><td>
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;">Your login details</p>
              <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong style="color:#0a0f0b;">Email:</strong> ${email}</p>
              <p style="margin:0;font-size:14px;color:#3f3f46;"><strong style="color:#0a0f0b;">App:</strong> <a href="${mobileUrl}" style="color:#1ED760;text-decoration:none;">${mobileUrl}</a></p>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
            After setting your password, open the app on your phone and sign in with your email. You'll see your assigned jobs, schedule, and can message the team.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.6;">
            This invite link expires in 24 hours. If you didn't expect this email, you can safely ignore it.<br>
            © ${new Date().getFullYear()} Kardama
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
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
