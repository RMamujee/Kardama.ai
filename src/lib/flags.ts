/**
 * Runtime feature flags via Vercel Edge Config.
 *
 * Edge Config reads are sub-millisecond and don't redeploy — flip a switch
 * in the Vercel dashboard and every running instance picks it up immediately.
 * Useful for emergency kill switches: if OpenAI charges spike, the booking
 * flow misbehaves, or Twilio costs balloon, you can disable a feature in
 * seconds without a code change.
 *
 * Falls back to default values if Edge Config isn't configured (local dev,
 * or if EDGE_CONFIG env var is missing). Defaults err on "everything on".
 */
import { get, has } from '@vercel/edge-config'

interface KardamaFlags {
  /** Master switch for /api/marketing/generate. False = always template fallback. */
  aiPostGenEnabled: boolean
  /** Master switch for the daily campaign-scan cron. False = scan returns 200 noop. */
  cronCampaignScanEnabled: boolean
  /** Master switch for /api/sms/send and /api/campaigns/send. False = 503. */
  smsSendingEnabled: boolean
  /** Show a banner on /book/<token> warning of capacity issues. */
  bookingMaintenanceBanner: string | null
}

const DEFAULTS: KardamaFlags = {
  aiPostGenEnabled: true,
  cronCampaignScanEnabled: true,
  smsSendingEnabled: true,
  bookingMaintenanceBanner: null,
}

function isEdgeConfigConfigured(): boolean {
  return Boolean(process.env.EDGE_CONFIG)
}

export async function flag<K extends keyof KardamaFlags>(key: K): Promise<KardamaFlags[K]> {
  if (!isEdgeConfigConfigured()) return DEFAULTS[key]
  try {
    if (!(await has(key as string))) return DEFAULTS[key]
    const value = await get<KardamaFlags[K]>(key as string)
    return value ?? DEFAULTS[key]
  } catch (err) {
    console.error('[flags] edge-config read failed for', key, err)
    return DEFAULTS[key]
  }
}
