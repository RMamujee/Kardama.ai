import { ImageResponse } from 'next/og'
import { verifyToken } from '@/lib/booking-tokens'
import { CUSTOMERS } from '@/lib/mock-data'

// Node runtime (not edge) so we can use the same node:crypto-based verifyToken
// that the booking flow uses. ImageResponse works on Node too.
export const runtime = 'nodejs'
export const alt = 'Book your Kardama cleaning'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Best-effort personalization — never throw on a bad token, just render
  // the generic card so iMessage / WhatsApp / Slack previews always succeed.
  let firstName = 'there'
  let city = ''
  try {
    const decoded = verifyToken(token)
    if (decoded) {
      const customer = CUSTOMERS.find(c => c.id === decoded.customerId)
      if (customer) {
        firstName = customer.name.split(' ')[0]
        city = customer.city
      }
    }
  } catch {
    // fall through to generic card
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background:
            'linear-gradient(135deg, #0A0E1A 0%, #1D1B3A 50%, #0A0E1A 100%)',
          color: '#F2F5FA',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header — logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #8B85F2, #524CCB)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 38,
            }}
          >
            ✨
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Kardama
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#7A75E0',
                marginTop: 2,
              }}
            >
              AI Field Service
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: '#F2F5FA',
            }}
          >
            Hey {firstName} —
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              color: '#D7DCE8',
              maxWidth: 1000,
            }}
          >
            Pick a time for your next cleaning
            {city ? ` in ${city}` : ''}.
          </div>
        </div>

        {/* Footer — pill with CTA hint */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 22px',
              borderRadius: 999,
              background: 'rgba(139, 133, 242, 0.18)',
              border: '1px solid rgba(139, 133, 242, 0.4)',
              fontSize: 26,
              fontWeight: 600,
              color: '#8B85F2',
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: '#34D399',
                boxShadow: '0 0 20px #34D399',
              }}
            />
            Tap to book — takes under a minute
          </div>
          <div style={{ fontSize: 22, color: '#6E778C' }}>kardama.ai</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
