import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/supabase/dal'
import type { PaymentMethod } from '@/types/payment'

// PATCH /api/payments/[id] — owner confirms receipt or cancels a payment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getSessionUser()
  if (!user || user.role !== 'owner_operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { status: 'received' | 'confirmed' | 'cancelled'; method?: PaymentMethod; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status, method, note } = body

  if (status !== 'received' && status !== 'confirmed' && status !== 'cancelled') {
    return NextResponse.json({ error: 'status must be "received", "confirmed" or "cancelled"' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('payments')
    .update({
      status,
      ...(method ? { method } : {}),
      ...(note ? { confirmation_note: note } : {}),
    })
    .eq('id', id)

  if (error) {
    console.error('[PATCH /api/payments/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fire receipt email when owner confirms payment
  const n8nReceiptWebhook = process.env.N8N_PAYMENT_RECEIPT_WEBHOOK_URL
  if (n8nReceiptWebhook && status === 'confirmed') {
    try {
      const admin = getSupabaseAdminClient()
      const { data: payment } = await admin
        .from('payments')
        .select('customer_id, job_id, amount, method')
        .eq('id', id)
        .single()
      if (payment?.customer_id) {
        const [{ data: customer }, { data: job }] = await Promise.all([
          admin.from('customers').select('name, email').eq('id', payment.customer_id).single(),
          payment.job_id
            ? admin.from('jobs').select('service_type, scheduled_date, address').eq('id', payment.job_id).single()
            : Promise.resolve({ data: null }),
        ])
        if (customer?.email) {
          fetch(n8nReceiptWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: id,
              customerName: customer.name,
              customerEmail: customer.email,
              serviceType: job?.service_type ?? 'cleaning',
              scheduledDate: job?.scheduled_date ?? '',
              address: job?.address ?? '',
              amount: payment.amount,
              method: method ?? payment.method ?? 'cash',
            }),
          }).catch(e => console.error('n8n receipt webhook failed:', e))
        }
      }
    } catch (e) {
      console.error('receipt webhook lookup failed:', e)
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/payments/[id] — owner deletes a payment record
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getSessionUser()
  if (!user || user.role !== 'owner_operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('payments').delete().eq('id', id)

  if (error) {
    console.error('[DELETE /api/payments/:id]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
