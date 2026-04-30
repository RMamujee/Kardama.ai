import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { autoAssignBookingRequest } from '@/lib/auto-assign'
import { SERVICE_PRICES, VALID_SERVICE_TYPES, VALID_TIMES } from '@/lib/services'

const VALID_TIMES_SET = new Set(VALID_TIMES)

const CORS = {
  'Access-Control-Allow-Origin': 'https://kardama-intake.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

function to24h(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})(am|pm)$/i)
  if (!m) return t
  let h = parseInt(m[1]), min = parseInt(m[2])
  const period = m[3].toLowerCase()
  if (period === 'pm' && h !== 12) h += 12
  if (period === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })

  const {
    customer_name, customer_phone, customer_email,
    address, city, service_type,
    preferred_date, preferred_time: rawTime, notes,
    home_size, cleaning_frequency,
  } = body
  const preferred_time = rawTime ? to24h(String(rawTime)) : rawTime

  if (!customer_name || !customer_phone || !customer_email || !address || !service_type || !preferred_date || !preferred_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: CORS })
  }

  if (!VALID_SERVICE_TYPES.has(service_type)) {
    return NextResponse.json({ error: 'Invalid service type' }, { status: 400, headers: CORS })
  }

  if (!VALID_TIMES_SET.has(preferred_time)) {
    return NextResponse.json({ error: 'Invalid time slot' }, { status: 400, headers: CORS })
  }

  const today = new Date().toISOString().split('T')[0]
  if (preferred_date <= today) {
    return NextResponse.json({ error: 'Date must be in the future' }, { status: 400, headers: CORS })
  }

  const sanitized = {
    customer_name: String(customer_name).trim().slice(0, 120),
    customer_phone: String(customer_phone).trim().slice(0, 30),
    customer_email: String(customer_email).trim().toLowerCase().slice(0, 120),
    address: String(address).trim().slice(0, 300),
    city: city ? String(city).trim().slice(0, 80) : null,
    notes: notes ? String(notes).trim().slice(0, 500) : '',
    home_size: home_size ? String(home_size).trim().slice(0, 60) : '',
    cleaning_frequency: cleaning_frequency ? String(cleaning_frequency).trim().slice(0, 60) : '',
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('booking_requests')
    .insert({
      ...sanitized,
      service_type,
      preferred_date,
      preferred_time,
      source: 'web',
    })
    .select('id')
    .single()

  if (error) {
    console.error('intake insert error', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500, headers: CORS })
  }

  // Auto-assign — find best available team, create customer + job records
  let assignment: { jobId: string; customerId: string; cleanerIds: string[]; cleanerNames: string[] } | null = null
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const result = await autoAssignBookingRequest({
        bookingRequestId: data.id,
        customerName: sanitized.customer_name,
        customerPhone: sanitized.customer_phone,
        customerEmail: sanitized.customer_email,
        address: sanitized.address,
        city: sanitized.city,
        serviceType: service_type,
        preferredDate: preferred_date,
        preferredTime: preferred_time,
        notes: sanitized.notes,
      })
      if (result) {
        assignment = {
          jobId: result.jobId,
          customerId: result.customerId,
          cleanerIds: result.cleanerIds,
          cleanerNames: result.cleanerNames,
        }
      }
    } catch (e) {
      console.error('auto-assign error:', e)
    }
  }

  // Auto-log a pending payment so the owner can confirm receipt when it arrives
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
      const admin = getSupabaseAdminClient()
      const now = new Date()
      await admin.from('payments').insert({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        job_id: assignment?.jobId ?? null,
        booking_ref: data.id,
        customer_id: assignment?.customerId ?? null,
        cleaner_ids: assignment?.cleanerIds ?? [],
        amount: SERVICE_PRICES[service_type] ?? 165,
        status: 'pending',
        confirmation_note: `Intake: ${sanitized.customer_name} — ${service_type}`,
        received_at: now.toISOString(),
        month: now.toISOString().slice(0, 7),
      })
    } catch (e) {
      console.error('intake: payment log failed', e)
    }
  }

  // Fire n8n booking confirmation email (fire-and-forget)
  const n8nWebhook = process.env.N8N_BOOKING_WEBHOOK_URL
  if (n8nWebhook) {
    fetch(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: data.id,
        customerName: sanitized.customer_name,
        customerEmail: sanitized.customer_email,
        customerPhone: sanitized.customer_phone,
        serviceType: service_type,
        preferredDate: preferred_date,
        preferredTime: preferred_time,
        homeSize: sanitized.home_size || null,
        cleaningFrequency: sanitized.cleaning_frequency || null,
        address: sanitized.address,
        notes: sanitized.notes,
        cleanerNames: assignment?.cleanerNames ?? [],
        manageUrl: `https://kardama-intake.vercel.app/?manage=${data.id}`,
        rescheduleUrl: `https://kardama-intake.vercel.app/?manage=${data.id}&action=reschedule`,
        cancelUrl: `https://kardama-intake.vercel.app/?manage=${data.id}&action=cancel`,
      }),
    }).catch(e => console.error('n8n webhook failed:', e))
  }

  // Fire n8n cleaner assignment notification — one call per assigned cleaner (fire-and-forget)
  const n8nAssignWebhook = process.env.N8N_CLEANER_ASSIGNMENT_WEBHOOK_URL
  if (n8nAssignWebhook && assignment?.cleanerIds.length) {
    try {
      const admin = getSupabaseAdminClient()
      const { data: cleaners } = await admin
        .from('cleaners')
        .select('id, name, email, phone')
        .in('id', assignment.cleanerIds)
      if (cleaners?.length) {
        for (const cleaner of cleaners) {
          fetch(n8nAssignWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: assignment.jobId,
              cleanerName: cleaner.name,
              cleanerEmail: cleaner.email,
              cleanerPhone: cleaner.phone,
              customerName: sanitized.customer_name,
              serviceType: service_type,
              scheduledDate: preferred_date,
              scheduledTime: preferred_time,
              address: sanitized.address,
              jobUrl: `https://kardama-mobile.vercel.app/job/${assignment.jobId}`,
            }),
          }).catch(e => console.error('n8n cleaner assignment webhook failed:', e))
        }
      }
    } catch (e) {
      console.error('cleaner assignment webhook lookup failed:', e)
    }
  }

  // Fire n8n unassigned alert if no team could be assigned (fire-and-forget)
  const n8nUnassignedWebhook = process.env.N8N_UNASSIGNED_ALERT_WEBHOOK_URL
  if (n8nUnassignedWebhook && !assignment) {
    fetch(n8nUnassignedWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: data.id,
        customerName: sanitized.customer_name,
        customerEmail: sanitized.customer_email,
        customerPhone: sanitized.customer_phone,
        serviceType: service_type,
        preferredDate: preferred_date,
        preferredTime: preferred_time,
        address: sanitized.address,
        reason: 'No team available for this date/time — check cleaner availability and hours',
      }),
    }).catch(e => console.error('n8n unassigned alert webhook failed:', e))
  }

  return NextResponse.json({
    id: data.id,
    ...(assignment && { jobId: assignment.jobId, cleanerNames: assignment.cleanerNames }),
  }, { status: 201, headers: CORS })
}
