import { NextResponse } from 'next/server'
import { createSupabaseAnonClient } from '@/lib/supabase/server'

const VALID_SERVICE_TYPES = new Set(['standard', 'deep', 'move-out', 'post-construction', 'airbnb'])
const VALID_TIMES = new Set([
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
])

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    customer_name, customer_phone, customer_email,
    address, city, service_type,
    preferred_date, preferred_time, notes,
  } = body

  if (!customer_name || !customer_phone || !customer_email || !address || !service_type || !preferred_date || !preferred_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!VALID_SERVICE_TYPES.has(service_type)) {
    return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
  }

  if (!VALID_TIMES.has(preferred_time)) {
    return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  if (preferred_date <= today) {
    return NextResponse.json({ error: 'Date must be in the future' }, { status: 400 })
  }

  const supabase = createSupabaseAnonClient()
  const { data, error } = await supabase
    .from('booking_requests')
    .insert({
      customer_name: String(customer_name).trim().slice(0, 120),
      customer_phone: String(customer_phone).trim().slice(0, 30),
      customer_email: String(customer_email).trim().toLowerCase().slice(0, 120),
      address: String(address).trim().slice(0, 300),
      city: city ? String(city).trim().slice(0, 80) : null,
      service_type,
      preferred_date,
      preferred_time,
      notes: notes ? String(notes).trim().slice(0, 500) : '',
      source: 'web',
    })
    .select('id')
    .single()

  if (error) {
    console.error('intake insert error', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
