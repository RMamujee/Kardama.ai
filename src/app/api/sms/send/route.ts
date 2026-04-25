import { NextResponse } from 'next/server'
import { sendSms } from '@/lib/twilio'

export async function POST(request: Request) {
  const { to, body, jobId, customerId, template } = await request.json()

  if (!to || !body) {
    return NextResponse.json({ error: 'Missing required fields: to, body' }, { status: 400 })
  }

  try {
    const { sid } = await sendSms(to, body)
    return NextResponse.json({ success: true, sid })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send SMS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
