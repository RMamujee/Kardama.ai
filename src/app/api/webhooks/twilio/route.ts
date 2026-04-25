import { validateRequest } from 'twilio'

export async function POST(request: Request) {
  const text = await request.text()
  const params = Object.fromEntries(new URLSearchParams(text))

  // Validate Twilio signature in production to reject spoofed requests
  if (process.env.NODE_ENV === 'production') {
    const authToken = process.env.TWILIO_AUTH_TOKEN!
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL!
    const signature = request.headers.get('x-twilio-signature') ?? ''

    if (!validateRequest(authToken, signature, webhookUrl, params)) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const { From, Body } = params
  console.log(`[twilio] inbound SMS from ${From}: ${Body}`)

  // No auto-reply — return empty TwiML
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
