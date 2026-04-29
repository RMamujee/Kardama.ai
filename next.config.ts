import type { NextConfig } from 'next'

const GMAPS = [
  'https://maps.googleapis.com',
  'https://maps.gstatic.com',
]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseWss = supabaseUrl.replace(/^https:\/\//, 'wss://')

const SUPABASE = [
  supabaseUrl,
  supabaseWss,
  'https://*.supabase.co',
  'wss://*.supabase.co',
]

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GMAPS.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${GMAPS.join(' ')}`,
  "font-src 'self' data:",
  `connect-src 'self' ${[...GMAPS, ...SUPABASE].join(' ')}`,
  "frame-ancestors 'none'",
].join('; ')

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy',    value: CSP },
        ],
      },
    ]
  },
}

export default nextConfig
