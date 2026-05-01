import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/supabase/dal'
import { signToken } from '@/lib/booking-tokens'
import { getCustomers } from '@/lib/data'

export async function POST(request: Request) {
  await requireOwner()
  const body = await request.json().catch(() => ({})) as { customerId?: string }
  const { customerId } = body

  if (!customerId) return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })

  const customers = await getCustomers()
  const customer = customers.find(c => c.id === customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  try {
    const token = signToken(customerId)
    return NextResponse.json({ token }, { status: 201 })
  } catch (err) {
    console.error('[bookings/token]', err)
    return NextResponse.json({ error: 'Token generation unavailable' }, { status: 500 })
  }
}
