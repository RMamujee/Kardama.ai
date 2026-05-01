import { getSupabaseAdminClient } from '../supabase/admin'
import { autoAssignBookingRequest } from '../auto-assign'
import { sendOwnerPush } from '../owner-push'
import { SERVICE_PRICES, SERVICE_DURATIONS, VALID_TIMES, VALID_SERVICE_TYPES } from '../services'

// OpenAI tool schemas. The shape matches what chat.completions expects in the
// `tools` parameter (type='function', function={name, description, parameters}).
// We keep the schema and the executor in the same file so they stay in sync —
// adding a new tool means writing exactly one entry below and one matching
// case in `runTool`.

export const TOOL_SCHEMAS = [
  {
    type: 'function' as const,
    function: {
      name: 'check_availability',
      description: 'Returns the list of valid HH:MM start times on a given date that have at least one cleaning team available for the requested service. Always call this BEFORE telling a customer a slot is open.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'ISO date in YYYY-MM-DD format' },
          service_type: { type: 'string', enum: ['standard', 'deep', 'move-out', 'post-construction', 'airbnb'] },
        },
        required: ['date', 'service_type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'quote_price',
      description: 'Returns the canonical price (USD) and duration (minutes) for a given service type. Use this whenever a customer asks "how much" — never quote a price you did not get from this tool.',
      parameters: {
        type: 'object',
        properties: {
          service_type: { type: 'string', enum: ['standard', 'deep', 'move-out', 'post-construction', 'airbnb'] },
        },
        required: ['service_type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_customer',
      description: 'Look up an existing customer by phone number. Returns their name, address, total spend, and recent jobs if found.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'E.164 phone number, e.g. +13105551234' },
        },
        required: ['phone'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_booking',
      description: 'Look up the next upcoming booking and the most recent past booking for a customer phone. Use this when a customer asks "when is my next clean" or wants to reference a prior visit.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'E.164 phone number' },
        },
        required: ['phone'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_booking',
      description: 'Create a confirmed booking and immediately auto-assign a team. Returns the booking id, assigned team names, and a confirmation message. Only call this once you have the customer\'s name, email, full street address with city, service type, and a date+time you have already verified with check_availability.',
      parameters: {
        type: 'object',
        properties: {
          customer_name:  { type: 'string' },
          customer_email: { type: 'string' },
          customer_phone: { type: 'string', description: 'E.164 phone — pass through the conversation phone' },
          address:        { type: 'string', description: 'Full street address including unit if any' },
          city:           { type: 'string' },
          service_type:   { type: 'string', enum: ['standard', 'deep', 'move-out', 'post-construction', 'airbnb'] },
          preferred_date: { type: 'string', description: 'YYYY-MM-DD, must be in the future' },
          preferred_time: { type: 'string', description: 'HH:MM in 24h, must be one of the valid slot times' },
          notes:          { type: 'string', description: 'Pets, allergies, access instructions, anything special. Empty string if none.' },
        },
        required: ['customer_name', 'customer_email', 'customer_phone', 'address', 'city', 'service_type', 'preferred_date', 'preferred_time', 'notes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reschedule_booking',
      description: 'Move an existing booking to a new date and time. Verify the new slot with check_availability first.',
      parameters: {
        type: 'object',
        properties: {
          booking_id:     { type: 'string' },
          new_date:       { type: 'string', description: 'YYYY-MM-DD' },
          new_time:       { type: 'string', description: 'HH:MM in 24h' },
        },
        required: ['booking_id', 'new_date', 'new_time'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_booking',
      description: 'Cancel an existing booking. Use only when the customer clearly asks to cancel.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'string' },
          reason:     { type: 'string', description: 'Customer-stated reason — kept for the owner\'s records.' },
        },
        required: ['booking_id', 'reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'escalate_to_owner',
      description: 'Hand the conversation to the owner. Sets the conversation to escalated mode. After calling this you should send one short final message acknowledging the handoff, then stop.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'One-line reason the owner needs to take this over.' },
        },
        required: ['reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_intake_link',
      description: 'Returns the URL of the customer-facing intake form. Use this once the customer is in our service area and has expressed interest in booking. Include the returned URL verbatim in your next reply with a friendly nudge.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City the customer mentioned (used for audit only).' },
          service_type: { type: 'string', description: 'Optional service type they mentioned (used for audit only).' },
        },
        required: ['city'],
        additionalProperties: false,
      },
    },
  },
]

// Tools that are safe for the social bot (Messenger / Instagram). Booking
// happens through the intake form, not via DM, so the booking-mutation tools
// are gated behind the SMS channel.
export const SOCIAL_TOOL_NAMES = new Set<string>([
  'check_availability',
  'quote_price',
  'send_intake_link',
  'escalate_to_owner',
])

export type ToolName =
  | 'check_availability' | 'quote_price'
  | 'lookup_customer' | 'lookup_booking'
  | 'create_booking' | 'reschedule_booking' | 'cancel_booking'
  | 'escalate_to_owner' | 'send_intake_link'

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string }

export interface ToolContext {
  conversationId: string
  customerPhone: string
  channel: 'sms' | 'messenger' | 'instagram'
}

// Dispatcher. Returns a string which is what gets passed back to OpenAI as
// the tool result. We always return a JSON string so the model gets
// structured data, not freeform text.
export async function runTool(
  name: string,
  argsRaw: string,
  ctx: ToolContext,
): Promise<string> {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(argsRaw || '{}')
  } catch {
    return JSON.stringify({ ok: false, error: 'invalid JSON arguments' })
  }

  try {
    const result = await dispatch(name as ToolName, args, ctx)
    return JSON.stringify(result)
  } catch (err) {
    console.error(`[ai-agent] tool ${name} threw:`, err)
    return JSON.stringify({ ok: false, error: 'tool execution failed' })
  }
}

async function dispatch(name: ToolName, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  switch (name) {
    case 'check_availability':  return checkAvailability(args.date as string, args.service_type as string)
    case 'quote_price':         return quotePrice(args.service_type as string)
    case 'lookup_customer':     return lookupCustomer((args.phone as string) ?? ctx.customerPhone)
    case 'lookup_booking':      return lookupBooking((args.phone as string) ?? ctx.customerPhone)
    case 'create_booking':      return createBooking(args, ctx)
    case 'reschedule_booking':  return rescheduleBooking(args.booking_id as string, args.new_date as string, args.new_time as string)
    case 'cancel_booking':      return cancelBooking(args.booking_id as string, args.reason as string)
    case 'escalate_to_owner':   return escalate(ctx.conversationId, args.reason as string)
    case 'send_intake_link':    return sendIntakeLink()
    default:                    return { ok: false, error: `unknown tool: ${name}` }
  }
}

function sendIntakeLink(): ToolResult {
  return {
    ok: true,
    data: {
      url: 'https://kardama-intake.vercel.app',
      instructions: 'Include this URL verbatim in your next reply, with a short, friendly nudge to fill it out.',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool implementations
// ─────────────────────────────────────────────────────────────────────────────

function quotePrice(serviceType: string): ToolResult {
  if (!VALID_SERVICE_TYPES.has(serviceType)) {
    return { ok: false, error: 'invalid service type' }
  }
  return {
    ok: true,
    data: {
      service_type: serviceType,
      price_dollars: SERVICE_PRICES[serviceType],
      duration_minutes: SERVICE_DURATIONS[serviceType],
    },
  }
}

function parseMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Returns the slot times on a date that have at least one team free for the
// requested service. Mirrors the conflict-detection logic in /api/intake but
// returns the full set rather than booleaning a single slot.
async function checkAvailability(date: string, serviceType: string): Promise<ToolResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'date must be YYYY-MM-DD' }
  if (!VALID_SERVICE_TYPES.has(serviceType)) return { ok: false, error: 'invalid service type' }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  if (date <= today) return { ok: false, error: 'date must be in the future' }

  const duration = SERVICE_DURATIONS[serviceType] ?? 150
  const admin = getSupabaseAdminClient()

  const [{ data: cleaners }, { data: jobs }] = await Promise.all([
    admin.from('cleaners').select('id, team_id, available_hours').not('team_id', 'is', null),
    admin.from('jobs')
      .select('cleaner_ids, scheduled_time, estimated_duration')
      .eq('scheduled_date', date)
      .neq('status', 'cancelled'),
  ])

  if (!cleaners?.length) return { ok: true, data: { date, service_type: serviceType, available_times: [] } }

  const teamMap = new Map<string, typeof cleaners>()
  for (const c of cleaners) {
    if (!c.team_id) continue
    const list = teamMap.get(c.team_id) ?? []
    list.push(c)
    teamMap.set(c.team_id, list)
  }

  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(date + 'T12:00:00').getDay()]

  const availableTimes = VALID_TIMES.filter((time) => {
    const slotStart = parseMin(time)
    const slotEnd   = slotStart + duration + 30
    if (slotStart + duration > 17 * 60) return false // must end by 5pm

    for (const teamCleaners of teamMap.values()) {
      let teamFree = true
      for (const c of teamCleaners) {
        const hours = (c.available_hours as Record<string, { start: string; end: string } | null> | null)?.[dayName]
        if (!hours) { teamFree = false; break }
        if (slotStart < parseMin(hours.start) || slotEnd > parseMin(hours.end)) { teamFree = false; break }
        const conflict = (jobs ?? []).some((j) => {
          if (!(j.cleaner_ids as string[]).includes(c.id)) return false
          const jStart = parseMin(j.scheduled_time as string)
          const jEnd = jStart + ((j.estimated_duration as number) ?? 150) + 30
          return !(slotEnd <= jStart || slotStart >= jEnd)
        })
        if (conflict) { teamFree = false; break }
      }
      if (teamFree) return true // at least one team is free for this slot
    }
    return false
  })

  return { ok: true, data: { date, service_type: serviceType, available_times: availableTimes } }
}

async function lookupCustomer(phone: string): Promise<ToolResult> {
  const admin = getSupabaseAdminClient()
  const { data: customers } = await admin
    .from('customers')
    .select('id, name, phone, email, address, city, total_spent, notes, job_history')
  if (!customers) return { ok: true, data: null }
  const match = customers.find((c) => normPhone(c.phone) === phone)
  if (!match) return { ok: true, data: null }
  return {
    ok: true,
    data: {
      id: match.id,
      name: match.name,
      email: match.email,
      address: match.address,
      city: match.city,
      total_spent_dollars: Number(match.total_spent),
      notes: match.notes || null,
      past_job_count: (match.job_history ?? []).length,
    },
  }
}

async function lookupBooking(phone: string): Promise<ToolResult> {
  const admin = getSupabaseAdminClient()
  const lookup = await lookupCustomer(phone)
  if (!lookup.ok || !lookup.data) {
    return { ok: true, data: { next: null, last: null, customer_known: false } }
  }
  const customerId = (lookup.data as { id: string }).id
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  const [{ data: upcoming }, { data: past }] = await Promise.all([
    admin.from('jobs')
      .select('id, scheduled_date, scheduled_time, service_type, status, address')
      .eq('customer_id', customerId)
      .gte('scheduled_date', today)
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(1),
    admin.from('jobs')
      .select('id, scheduled_date, scheduled_time, service_type, status')
      .eq('customer_id', customerId)
      .lt('scheduled_date', today)
      .order('scheduled_date', { ascending: false })
      .limit(1),
  ])
  return {
    ok: true,
    data: {
      customer_known: true,
      next: upcoming?.[0] ?? null,
      last: past?.[0] ?? null,
    },
  }
}

async function createBooking(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const a = args as {
    customer_name: string; customer_email: string; customer_phone: string
    address: string; city: string; service_type: string
    preferred_date: string; preferred_time: string; notes: string
  }

  // Defense-in-depth: validate before we hit the DB even though OpenAI's
  // schema enforcement should have caught these.
  if (!VALID_SERVICE_TYPES.has(a.service_type)) return { ok: false, error: 'invalid service type' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.preferred_date)) return { ok: false, error: 'invalid date format' }
  if (!/^\d{2}:\d{2}$/.test(a.preferred_time)) return { ok: false, error: 'invalid time format' }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  if (a.preferred_date <= today) return { ok: false, error: 'date must be in the future' }

  const admin = getSupabaseAdminClient()

  // Insert booking_request first — auto-assign needs the row to update its
  // status afterwards.
  const { data: br, error: brErr } = await admin
    .from('booking_requests')
    .insert({
      customer_name: a.customer_name.slice(0, 120),
      customer_phone: ctx.customerPhone || a.customer_phone,
      customer_email: a.customer_email.toLowerCase().slice(0, 120),
      address: a.address.slice(0, 300),
      city: a.city?.slice(0, 80) ?? null,
      service_type: a.service_type as 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb',
      preferred_date: a.preferred_date,
      preferred_time: a.preferred_time,
      notes: (a.notes ?? '').slice(0, 500),
      source: 'sms-ai',
    })
    .select('id')
    .single()

  if (brErr || !br) {
    console.error('[ai-agent] booking_request insert failed', brErr)
    return { ok: false, error: 'could not create booking request' }
  }

  // Auto-assign — finds the best team and creates customer + job.
  let assignment = null
  try {
    assignment = await autoAssignBookingRequest({
      bookingRequestId: br.id,
      customerName: a.customer_name,
      customerPhone: ctx.customerPhone || a.customer_phone,
      customerEmail: a.customer_email,
      address: a.address,
      city: a.city ?? null,
      serviceType: a.service_type,
      preferredDate: a.preferred_date,
      preferredTime: a.preferred_time,
      notes: a.notes ?? '',
    })
  } catch (err) {
    console.error('[ai-agent] auto-assign threw', err)
  }

  // Link conversation → customer if we just discovered them via this booking.
  if (assignment?.customerId) {
    await admin
      .from('sms_conversations')
      .update({ customer_id: assignment.customerId })
      .eq('id', ctx.conversationId)
      .is('customer_id', null)
  }

  return {
    ok: true,
    data: {
      booking_id: br.id,
      job_id: assignment?.jobId ?? null,
      assigned: Boolean(assignment),
      cleaner_first_names: (assignment?.cleanerNames ?? []).map((n) => n.split(' ')[0]),
      price_dollars: SERVICE_PRICES[a.service_type] ?? 165,
      duration_minutes: SERVICE_DURATIONS[a.service_type] ?? 150,
      message_to_customer: assignment
        ? `Confirmed for ${a.preferred_date} at ${a.preferred_time}.`
        : `Booking received — we'll confirm a time after checking team availability.`,
    },
  }
}

async function rescheduleBooking(bookingId: string, newDate: string, newTime: string): Promise<ToolResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return { ok: false, error: 'invalid date format' }
  if (!/^\d{2}:\d{2}$/.test(newTime)) return { ok: false, error: 'invalid time format' }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  if (newDate <= today) return { ok: false, error: 'date must be in the future' }

  const admin = getSupabaseAdminClient()
  const { data: br } = await admin
    .from('booking_requests')
    .select('id, converted_job_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (!br) return { ok: false, error: 'booking not found' }

  await admin.from('booking_requests')
    .update({ preferred_date: newDate, preferred_time: newTime })
    .eq('id', bookingId)

  if (br.converted_job_id) {
    await admin.from('jobs')
      .update({ scheduled_date: newDate, scheduled_time: newTime, status: 'scheduled' })
      .eq('id', br.converted_job_id)
  }

  return { ok: true, data: { booking_id: bookingId, new_date: newDate, new_time: newTime } }
}

async function cancelBooking(bookingId: string, reason: string): Promise<ToolResult> {
  const admin = getSupabaseAdminClient()
  const { data: br } = await admin
    .from('booking_requests')
    .select('id, converted_job_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (!br) return { ok: false, error: 'booking not found' }

  await admin.from('booking_requests')
    .update({ status: 'declined', notes: `Cancelled by customer via SMS: ${reason}` })
    .eq('id', bookingId)

  if (br.converted_job_id) {
    await admin.from('jobs').update({ status: 'cancelled' }).eq('id', br.converted_job_id)
  }
  return { ok: true, data: { booking_id: bookingId, cancelled: true } }
}

async function escalate(conversationId: string, reason: string): Promise<ToolResult> {
  const admin = getSupabaseAdminClient()
  await admin
    .from('sms_conversations')
    .update({ mode: 'escalated', escalation_reason: reason })
    .eq('id', conversationId)

  // Fan out the escalation through every channel we have available, all
  // fire-and-forget so a third-party failure doesn't bubble up to the agent.
  const webhookUrl = process.env.N8N_AI_ESCALATION_WEBHOOK_URL
  if (webhookUrl) {
    notifyOwnerOfEscalation(conversationId, reason, webhookUrl).catch((err) =>
      console.error('[ai-agent] escalation webhook failed', err),
    )
  }
  pushOwnerForEscalation(conversationId, reason).catch((err) =>
    console.error('[ai-agent] escalation push failed', err),
  )

  return { ok: true, data: { escalated: true } }
}

async function pushOwnerForEscalation(conversationId: string, reason: string) {
  const admin = getSupabaseAdminClient()
  const { data: conv } = await admin
    .from('sms_conversations')
    .select('customer_phone, customer_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (!conv) return
  let displayName: string | null = null
  if (conv.customer_id) {
    const { data: c } = await admin.from('customers').select('name').eq('id', conv.customer_id).maybeSingle()
    displayName = (c as { name?: string } | null)?.name ?? null
  }
  await sendOwnerPush({
    title: 'AI escalated a thread',
    body: `${displayName ?? conv.customer_phone}: ${reason}`,
    url: `/sms-inbox?id=${conversationId}`,
    tag: `escalation-${conversationId}`,
  })
}

async function notifyOwnerOfEscalation(
  conversationId: string,
  reason: string,
  webhookUrl: string,
): Promise<void> {
  const admin = getSupabaseAdminClient()
  const { data: conv } = await admin
    .from('sms_conversations')
    .select('customer_phone, customer_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (!conv) return

  const [{ data: customer }, { data: lastMsg }] = await Promise.all([
    conv.customer_id
      ? admin.from('customers').select('name').eq('id', conv.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from('sms_messages')
      .select('body')
      .eq('conversation_id', conversationId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://kardama-ai.vercel.app'

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId,
      customerPhone: conv.customer_phone,
      customerName: (customer as { name?: string } | null)?.name ?? null,
      escalationReason: reason,
      lastMessage: (lastMsg as { body?: string } | null)?.body ?? '',
      threadUrl: `${baseUrl}/sms-inbox/${conversationId}`,
      ownerEmail: process.env.OWNER_EMAIL ?? 'heyrahil@gmail.com',
      ownerPhone: process.env.OWNER_PHONE ?? '',
    }),
  })
}

function normPhone(raw: string): string | null {
  const d = (raw ?? '').replace(/\D/g, '')
  if (d.length < 10 || d.length > 15) return null
  return d.length === 10 ? `+1${d}` : `+${d}`
}
