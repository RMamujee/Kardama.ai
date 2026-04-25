import Twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!

export const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!

// Lazy singleton — avoids instantiation at import time during SSG
let _client: ReturnType<typeof Twilio> | null = null
function getClient() {
  if (!_client) _client = Twilio(accountSid, authToken)
  return _client
}

export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

export async function sendSms(to: string, body: string): Promise<{ sid: string }> {
  const message = await getClient().messages.create({
    body,
    from: twilioPhoneNumber,
    to: toE164(to),
  })
  return { sid: message.sid }
}
