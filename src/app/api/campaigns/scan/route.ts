import { NextResponse } from 'next/server'
import { detectNurturingCandidates } from '@/lib/campaign-engine'
import { signToken } from '@/lib/booking-tokens'
import { sendSms } from '@/lib/twilio'
import { CUSTOMERS } from '@/lib/mock-data'

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically
// when the CRON_SECRET env var is set on the project. Reject anything else.
function isAuthorizedCron(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = request.headers.get('authorization') ?? ''
  return auth === `Bearer ${expected}`
}

// Hard caps so a misconfiguration can't blast hundreds of SMS in one run.
const MAX_PER_RUN = 25
const TWILIO_MIN_INTERVAL_MS = 250

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Pre-flight: don't try to send if Twilio isn't configured.
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://kardama.ai')

  const candidates = detectNurturingCandidates()
    .filter(c => c.status === 'pending')
    .slice(0, MAX_PER_RUN)

  const results: Array<{ customerId: string; success: boolean; sid?: string; error?: string }> = []

  for (const candidate of candidates) {
    const customer = CUSTOMERS.find(c => c.id === candidate.customerId)
    if (!customer) {
      results.push({ customerId: candidate.customerId, success: false, error: 'Customer not found' })
      continue
    }

    try {
      // Always sign tokens server-side with the HMAC secret — never reuse the
      // base64 placeholder from campaign-engine.ts.
      const token = signToken(customer.id)
      const link = `${baseUrl}/book/${token}`
      const message = `${candidate.message}\n\nBook here: ${link}`

      const { sid } = await sendSms(customer.phone, message)
      results.push({ customerId: customer.id, success: true, sid })
    } catch (err) {
      console.error('[campaigns/scan] send failed for', candidate.customerId, err)
      results.push({
        customerId: candidate.customerId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await sleep(TWILIO_MIN_INTERVAL_MS)
  }

  const sent = results.filter(r => r.success).length
  console.log(`[campaigns/scan] processed ${results.length} candidates, ${sent} sent`)

  return NextResponse.json({
    scanned: candidates.length,
    sent,
    failed: results.length - sent,
    capped: candidates.length === MAX_PER_RUN,
    results,
  })
}

// Pro-tier function timeout — give Twilio batch room to breathe
export const maxDuration = 120
