import { NextResponse } from 'next/server'
import { sendSms, toE164 } from '@/lib/twilio'
import { getCustomers } from '@/lib/data'
import { flag } from '@/lib/flags'

export async function POST(request: Request) {
  if (!(await flag('smsSendingEnabled'))) {
    return NextResponse.json({ error: 'SMS sending temporarily disabled' }, { status: 503 })
  }

  const { to, body } = await request.json() as { to?: string; body?: string }

  if (!to || !body) {
    return NextResponse.json({ error: 'Missing required fields: to, body' }, { status: 400 })
  }

  if (body.length > 480) {
    return NextResponse.json({ error: 'Message body too long' }, { status: 400 })
  }

  // Restrict recipients to known customers — prevents use as an open SMS relay (CRIT-1)
  const e164 = toE164(to)
  const customers = await getCustomers()
  if (!e164 || !customers.some(c => toE164(c.phone) === e164)) {
    return NextResponse.json({ error: 'Recipient not permitted' }, { status: 403 })
  }

  try {
    const { sid } = await sendSms(to, body)
    return NextResponse.json({ success: true, sid })
  } catch (err) {
    console.error('[sms/send]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })  // MED-5
  }
}

export const maxDuration = 30
