'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/supabase/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signToken } from '@/lib/booking-tokens'
import { sendSms } from '@/lib/twilio'
import { geocodeAddress } from '@/lib/geocode'

// ─── Add customer ─────────────────────────────────────────────────────────

const NewCustomerSchema = z.object({
  name:    z.string().trim().min(2, 'Name is too short').max(120),
  phone:   z.string().trim().min(7, 'Phone looks invalid').max(40),
  email:   z.string().trim().email('Invalid email').max(120),
  address: z.string().trim().min(5, 'Address is too short').max(240),
  city:    z.string().trim().min(2).max(80),
  source:  z.enum(['facebook', 'yelp', 'referral', 'text', 'repeat']),
  notes:   z.string().trim().max(500).optional().default(''),
})

export type AddCustomerInput = z.infer<typeof NewCustomerSchema>

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export async function addCustomer(input: AddCustomerInput): Promise<ActionResult<{ id: string }>> {
  await requireOwner()

  const parsed = NewCustomerSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      if (key) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors }
  }

  const data = parsed.data

  // Geocode best-effort. If it fails we still create the customer (no map pin
  // until they edit the address) — better than blocking the create flow.
  const geo = await geocodeAddress(`${data.address}, ${data.city}`)
  const lat = geo?.lat ?? 0
  const lng = geo?.lng ?? 0

  const supabase = await createSupabaseServerClient()
  const id = `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

  const { error } = await supabase.from('customers').insert({
    id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: data.address,
    lat,
    lng,
    city: data.city,
    preferred_cleaner_ids: [],
    job_history: [],
    source: data.source,
    notes: data.notes ?? '',
    total_spent: 0,
  })

  if (error) {
    console.error('[addCustomer] insert failed:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/customers')
  revalidatePath('/dashboard')
  return { ok: true, data: { id } }
}

// ─── Send booking link via SMS ────────────────────────────────────────────

const SendLinkSchema = z.object({
  customerId: z.string().min(1),
  message: z.string().trim().min(1).max(400).optional(),
})

export async function sendBookingLink(input: z.infer<typeof SendLinkSchema>): Promise<ActionResult<{ sid: string }>> {
  await requireOwner()

  const parsed = SendLinkSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' }
  }

  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER
  ) {
    return { ok: false, error: 'Twilio is not configured yet — no SMS will be sent.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('id', parsed.data.customerId)
    .single()

  if (error || !customer) {
    return { ok: false, error: 'Customer not found' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kardama.ai')

  const token = signToken(customer.id)
  const link = `${baseUrl}/book/${token}`
  const firstName = customer.name.split(' ')[0]
  const fallback = parsed.data.message?.trim() ||
    `Hi ${firstName}! Pick a time for your next cleaning here:`
  const body = `${fallback}\n${link}`

  try {
    const { sid } = await sendSms(customer.phone, body)
    return { ok: true, data: { sid } }
  } catch (err) {
    console.error('[sendBookingLink] failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' }
  }
}
