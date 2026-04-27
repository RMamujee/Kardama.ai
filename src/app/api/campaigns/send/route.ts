import { NextResponse } from 'next/server'
import { signToken } from '@/lib/booking-tokens'
import { sendSms } from '@/lib/twilio'
import { CUSTOMERS } from '@/lib/mock-data'
import { flag } from '@/lib/flags'

export async function POST(request: Request) {
  if (!(await flag('smsSendingEnabled'))) {
    return NextResponse.json({ error: 'SMS sending temporarily disabled' }, { status: 503 })
  }

  const { customerId, message } = await request.json() as { customerId?: string; message?: string }

  if (!customerId || !message) {
    return NextResponse.json({ error: 'Missing customerId or message' }, { status: 400 })
  }

  // Cap message length to prevent abuse
  if (message.length > 480) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  const customer = CUSTOMERS.find(c => c.id === customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Operator-precedence fix: NEXT_PUBLIC_BASE_URL takes priority, then VERCEL_URL, then fallback (HIGH-2)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kardama.ai')

  // Generate a fresh HMAC-signed token server-side — never trust client-supplied tokens (CRIT-3)
  let bookingLink = ''
  try {
    const token = signToken(customerId)
    bookingLink = `\n\nBook your slot here: ${baseUrl}/book/${token}`
  } catch (err) {
    console.error('[campaigns/send] token signing failed:', err)
    // Send without a booking link rather than failing entirely
  }

  const fullMessage = `${message}${bookingLink}`

  try {
    const { sid } = await sendSms(customer.phone, fullMessage)
    return NextResponse.json({ success: true, sid })   // sentTo intentionally omitted (HIGH-3)
  } catch (err) {
    console.error('[campaigns/send] SMS failed:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })  // MED-5
  }
}

export const maxDuration = 30
