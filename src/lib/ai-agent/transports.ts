import 'server-only'
import { sendSms } from '../twilio'

export type Channel = 'sms' | 'messenger' | 'instagram'

export interface SendArgs {
  channel: Channel
  recipient: string
  body: string
}

export interface SendResult {
  providerId: string | null
  twilioSid: string | null
}

const SMS_MAX = 480
const META_MAX = 2000
const META_GRAPH = 'https://graph.facebook.com/v20.0'

export async function sendByChannel({ channel, recipient, body }: SendArgs): Promise<SendResult> {
  if (!body.trim()) return { providerId: null, twilioSid: null }
  switch (channel) {
    case 'sms':       return sendViaSms(recipient, body)
    case 'messenger': return sendViaMeta(recipient, body, 'messenger')
    case 'instagram': return sendViaMeta(recipient, body, 'instagram')
  }
}

async function sendViaSms(phone: string, body: string): Promise<SendResult> {
  const r = await sendSms(phone, body.slice(0, SMS_MAX))
  return { providerId: null, twilioSid: r.sid }
}

async function sendViaMeta(recipientId: string, body: string, channel: 'messenger' | 'instagram'): Promise<SendResult> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!token) throw new Error('FB_PAGE_ACCESS_TOKEN not set')

  const trimmed = body.length > META_MAX ? body.slice(0, META_MAX - 1) + '…' : body

  const res = await fetch(`${META_GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: trimmed },
      messaging_type: 'RESPONSE',
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`${channel} send failed ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json().catch(() => ({})) as { message_id?: string }
  return { providerId: json.message_id ?? null, twilioSid: null }
}
