import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/dal'
import type { PaymentMethod } from '@/types/payment'

// PATCH /api/payments/[id] — human-in-the-loop: owner marks payment received or confirms it
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await getSessionUser()
  if (!user || user.role !== 'owner_operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { status: 'received' | 'confirmed'; method?: PaymentMethod; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status, method, note } = body

  if (status !== 'received' && status !== 'confirmed') {
    return NextResponse.json({ error: 'status must be "received" or "confirmed"' }, { status: 400 })
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

  return NextResponse.json({ ok: true })
}
