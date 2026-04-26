import { createHmac } from 'crypto'
import { format, addDays } from 'date-fns'

// Server-only — never import this file from client components or the Zustand store.

function secret(): string {
  const s = process.env.BOOKING_TOKEN_SECRET
  if (!s) throw new Error('BOOKING_TOKEN_SECRET env var is not set')
  return s
}

export interface TokenPayload {
  customerId: string
  created: string   // yyyy-MM-dd
  expires: string   // yyyy-MM-dd
}

export function signToken(customerId: string): string {
  const payload: TokenPayload = {
    customerId,
    created: format(new Date(), 'yyyy-MM-dd'),
    expires: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  }
  const data = JSON.stringify(payload)
  const sig = createHmac('sha256', secret()).update(data).digest('base64url')
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString('base64url')
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw) as TokenPayload & { sig: string }
    const { sig, ...payload } = parsed
    if (!sig || !payload.customerId || !payload.created || !payload.expires) return null
    const data = JSON.stringify(payload)
    const expected = createHmac('sha256', secret()).update(data).digest('base64url')
    if (sig.length !== expected.length) return null
    // Constant-time compare to prevent timing attacks
    let diff = 0
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    return diff === 0 ? (payload as TokenPayload) : null
  } catch {
    return null
  }
}
