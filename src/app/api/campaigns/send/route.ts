import { NextResponse } from 'next/server'
import { sendSms, toE164 } from '@/lib/twilio'
import { CUSTOMERS } from '@/lib/mock-data'

export async function POST(request: Request) {
  const { customerId, message, bookingLinkToken } = await request.json()

  if (!customerId || !message) {
    return NextResponse.json({ error: 'Missing customerId or message' }, { status: 400 })
  }

  const customer = CUSTOMERS.find(c => c.id === customerId)
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://kardama.ai'

  const bookingLink = bookingLinkToken ? `\n\nBook your slot here: ${baseUrl}/book/${bookingLinkToken}` : ''
  const fullMessage = `${message}${bookingLink}`

  try {
    const { sid } = await sendSms(customer.phone, fullMessage)
    return NextResponse.json({ success: true, sid, sentTo: customer.phone })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send SMS'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
