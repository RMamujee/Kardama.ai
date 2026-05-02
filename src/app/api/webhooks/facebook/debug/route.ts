import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Temporary diagnostic endpoint. Returns env-var presence (no values) and
// recent inbound webhook activity. DELETE this file once the bot is verified working.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const authKey = url.searchParams.get('key')
  if (authKey !== 'kardama-debug-9f3k2') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const env = {
    FB_VERIFY_TOKEN: Boolean(process.env.FB_VERIFY_TOKEN),
    FB_PAGE_ACCESS_TOKEN: Boolean(process.env.FB_PAGE_ACCESS_TOKEN),
    FB_APP_SECRET: Boolean(process.env.FB_APP_SECRET),
    FB_PAGE_ACCESS_TOKEN_length: process.env.FB_PAGE_ACCESS_TOKEN?.length ?? 0,
    FB_APP_SECRET_length: process.env.FB_APP_SECRET?.length ?? 0,
    FB_VERIFY_TOKEN_length: process.env.FB_VERIFY_TOKEN?.length ?? 0,
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
  }

  let pageInfo: unknown = null
  if (process.env.FB_PAGE_ACCESS_TOKEN) {
    try {
      const r = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(process.env.FB_PAGE_ACCESS_TOKEN)}`,
      )
      pageInfo = await r.json()
    } catch (e) {
      pageInfo = { error: (e as Error).message }
    }
  }

  let recentConvos: unknown = []
  let recentMessages: unknown = []
  try {
    const supabase = getSupabaseAdminClient()
    const { data: convos } = await supabase
      .from('sms_conversations')
      .select('id, channel, external_user_id, created_at, last_message_at')
      .in('channel', ['messenger', 'instagram'])
      .order('created_at', { ascending: false })
      .limit(5)
    recentConvos = convos ?? []

    const { data: msgs } = await supabase
      .from('sms_messages')
      .select('id, conversation_id, direction, body, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    recentMessages = msgs ?? []
  } catch (e) {
    recentConvos = { error: (e as Error).message }
  }

  return NextResponse.json({
    env,
    page: pageInfo,
    recentConvos,
    recentMessages,
    serverTime: new Date().toISOString(),
  })
}
