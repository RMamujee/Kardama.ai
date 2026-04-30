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
  const resendKey = process.env.RESEND_API_KEY

  let userId: string

  if (resendKey) {
    // Resend is configured — generate the invite link ourselves and send a
    // branded email so the cleaner knows exactly what app they're joining.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${mobileUrl}/auth/callback` },
    })
    if (linkErr || !linkData.user) {
      return { error: linkErr?.message ?? 'Failed to generate invite link' }
    }
    userId = linkData.user.id

    const resend = new Resend(resendKey)
    const fromDomain = process.env.RESEND_FROM ?? 'onboarding@resend.dev'
    await resend.emails.send({
      from: `Kardama <${fromDomain}>`,
      to: email,
      subject: "You've been invited to join Kardama",
      html: buildInviteEmail(name, email, linkData.properties.action_link, mobileUrl),
    })
  } else {
    // No Resend key — fall back to Supabase's built-in invite email.
    const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${mobileUrl}/auth/callback`,
    })
    if (inviteErr || !invite.user) {
      return { error: inviteErr?.message ?? 'Failed to send invite' }
    }
    userId = invite.user.id
  }

  // Flag the user so the mobile app prompts them to set a password on first login.
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { needs_password_setup: true },
  })

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
      }),
    }).catch(e => console.error('n8n cleaner welcome webhook failed:', e))
  }

  revalidatePath('/team')
  return { ok: true }
}

// ─────────────── Invite email template ───────────────

function buildInviteEmail(name: string, cleanerEmail: string, inviteUrl: string, mobileUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden">

        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #2a2a2a">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;height:40px;background:linear-gradient(135deg,#1ED760,#169C46);border-radius:10px;text-align:center;vertical-align:middle">
                <span style="color:#000;font-size:20px;font-weight:900;line-height:40px">K</span>
              </td>
              <td style="padding-left:12px;color:#fff;font-size:18px;font-weight:700;vertical-align:middle">Kardama</td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;color:#1ED760;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">You're invited</p>
          <h1 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:700;line-height:1.3">Hi ${name}, welcome to the team</h1>
          <p style="margin:0 0 28px;color:#999;font-size:15px;line-height:1.6">
            You've been added as a cleaner on Kardama. Click the button below to set your password and start using the app.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td align="center">
              <a href="${inviteUrl}"
                style="display:inline-block;background:#1ED760;color:#000;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none">
                Accept invite &amp; set password
              </a>
            </td></tr>
          </table>

          <!-- App URL box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:24px">
            <tr><td style="padding:16px 20px">
              <p style="margin:0 0 4px;color:#666;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">After setting your password, sign in at</p>
              <p style="margin:0;color:#1ED760;font-size:15px;font-weight:600">${mobileUrl}</p>
            </td></tr>
          </table>

          <p style="margin:0;color:#555;font-size:13px;line-height:1.5">
            Your login email is <strong style="color:#888">${cleanerEmail}</strong>.
            If you weren&apos;t expecting this invite, you can safely ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a">
          <p style="margin:0;color:#444;font-size:12px">© Kardama · Cleaner access only</p>
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
