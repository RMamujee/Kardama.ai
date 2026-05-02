import { NextResponse } from 'next/server'

// One-shot setup endpoint. Hits Meta Graph API to:
//   1. Subscribe the connected Page to messages + messaging_postbacks events
//   2. Verify the subscription stuck by reading it back
// Idempotent. Delete this file once the bot is verified working.
export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('key') !== 'kardama-debug-9f3k2') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'FB_PAGE_ACCESS_TOKEN not set' }, { status: 500 })
  }

  const results: Record<string, unknown> = {}

  // Step 1: identify the page
  try {
    const r = await fetch(
      `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
    )
    results.page = await r.json()
  } catch (e) {
    results.page = { error: (e as Error).message }
  }

  // Step 2: subscribe the page to webhook fields via Graph API
  try {
    const r = await fetch(
      `https://graph.facebook.com/v20.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads&access_token=${encodeURIComponent(token)}`,
      { method: 'POST' },
    )
    results.subscribe = await r.json()
    results.subscribe_status = r.status
  } catch (e) {
    results.subscribe = { error: (e as Error).message }
  }

  // Step 3: read it back to confirm
  try {
    const r = await fetch(
      `https://graph.facebook.com/v20.0/me/subscribed_apps?access_token=${encodeURIComponent(token)}`,
    )
    results.currentSubscriptions = await r.json()
  } catch (e) {
    results.currentSubscriptions = { error: (e as Error).message }
  }

  return NextResponse.json(results)
}
