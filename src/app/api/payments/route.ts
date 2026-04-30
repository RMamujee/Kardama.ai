import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/dal'
import type { PaymentMethod } from '@/types/payment'

function newPaymentId() {
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// POST /api/payments — owner manually logs a payment (from LogPaymentModal)
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== 'owner_operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    jobId?: string
    bookingRef?: string
    customerId: string
    cleanerIds?: string[]
    amount: number
    method?: PaymentMethod
    confirmationNote?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { jobId, bookingRef, customerId, cleanerIds, amount, method, confirmationNote } = body

  if (!customerId || amount == null) {
    return NextResponse.json({ error: 'Missing customerId or amount' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const now = new Date()

  const { data, error } = await supabase.from('payments').insert({
    id: newPaymentId(),
    job_id: jobId ?? null,
    booking_ref: bookingRef ?? null,
    customer_id: customerId,
    cleaner_ids: cleanerIds ?? [],
    amount,
    method: method ?? null,
    status: 'pending' as const,
    confirmation_note: confirmationNote ?? '',
    received_at: now.toISOString(),
    month: now.toISOString().slice(0, 7),
  }).select().single()

  if (error) {
    console.error('[POST /api/payments]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payment: data }, { status: 201 })
}
