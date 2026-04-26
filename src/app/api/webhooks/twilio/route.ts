import { validateRequest } from 'twilio'

export async function POST(request: Request) {
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL

  // If env vars are absent (e.g. local dev without Twilio), reject rather than skip validation (HIGH-1)
  if (!authToken || !webhookUrl) {
    return new Response('Service unavailable', { status: 503 })
  }

  const text   = await request.text()
  const params = Object.fromEntries(new URLSearchParams(text))
  const signature = request.headers.get('x-twilio-signature') ?? ''

  if (!validateRequest(authToken, signature, webhookUrl, params)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { From, Body } = params
  // Mask all but last 4 digits before logging (MED-4)
  const masked = From ? From.slice(0, -4).replace(/\d/g, '*') + From.slice(-4) : 'unknown'
  console.log(`[twilio] inbound SMS from ${masked} (${(Body ?? '').length} chars)`)

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
