import type { NextConfig } from 'next'

// Tile providers used by react-leaflet basemaps + marker icon CDN.
const TILE_HOSTS = [
  'https://*.basemaps.cartocdn.com',
  'https://*.arcgisonline.com',
  'https://server.arcgisonline.com',
  'https://*.tile.openstreetmap.org',
  'https://unpkg.com',
  // TomTom traffic overlay tiles
  'https://api.tomtom.com',
]

// Routing/geocoding APIs the live map and AI features call from the browser.
const API_HOSTS = [
  'https://router.project-osrm.org',
  'https://nominatim.openstreetmap.org',
  // Supabase — required for browser client (real-time subscriptions, auth token refresh)
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  'https://*.supabase.co',
]

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${TILE_HOSTS.join(' ')}`,
  "font-src 'self' data:",
  `connect-src 'self' ${API_HOSTS.join(' ')}`,
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
          // geolocation=(self) keeps the live-map GPS tracking feature working
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy',    value: CSP },
        ],
      },
    ]
  },
}

export default nextConfig
