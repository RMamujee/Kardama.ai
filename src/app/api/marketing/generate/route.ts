import { NextResponse } from 'next/server'
import { generateAiPost } from '@/lib/marketing-engine'
import type { MarketingTheme } from '@/types'
import type { PostTone } from '@/lib/marketing-engine'

const VALID_THEMES = new Set<MarketingTheme>([
  'social-proof', 'promo-discount', 'tips', 'before-after',
  'promo-referral', 'seasonal-spring', 'seasonal-summer',
  'seasonal-fall', 'seasonal-winter', 'holiday',
])
const VALID_TONES: PostTone[] = ['friendly', 'professional', 'urgent', 'seasonal']

const TONE_BLURBS: Record<PostTone, string> = {
  friendly: 'warm, conversational, emoji-friendly, like texting a neighbor',
  professional: 'polished, trust-building, focus on expertise and reliability',
  urgent: 'high-energy, scarcity-driven, FOMO triggers, strong call to action',
  seasonal: 'tied to the current season, evocative, celebratory',
}

const THEME_BRIEFS: Record<MarketingTheme, string> = {
  'social-proof': 'A 5-star testimonial-style post that highlights results and trust signals.',
  'promo-discount': 'A limited-time discount offer with a concrete dollar amount and a clear deadline.',
  'tips': 'Three quick, practical home-cleaning tips, then a soft pitch.',
  'before-after': 'A transformation story (before → after) for one specific job.',
  'promo-referral': 'Referral program promo: friend gets $25 off, customer gets $25 credit.',
  'seasonal-spring': 'Spring deep-cleaning push — fresh start, allergens, baseboards, windows.',
  'seasonal-summer': 'Summer prep — guests, parties, kids home from school.',
  'seasonal-fall': 'Fall refresh — back-to-school, cozy home, deep clean before holidays.',
  'seasonal-winter': 'Holiday prep — pre-party deep clean, post-party cleanup, gift certificates.',
  'holiday': 'A grateful seasonal greeting that doubles as a soft promotion.',
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

async function generateWithOpenAI(theme: MarketingTheme, tone: PostTone): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const system = `You are a marketing copywriter for Kardama, a home cleaning service operating in Long Beach, Torrance, El Segundo, and the broader South Bay LA area. Teams are 2 people, bonded and insured, with 1,200+ happy clients. Write Facebook posts that local homeowners would actually engage with. Keep posts under 120 words, use 1–3 relevant emojis, end with a clear call to action ("DM us", "Comment below", "Text us"), and include 3–5 hashtags on the final line.`

  const user = `Write one Facebook post.\nTheme: ${THEME_BRIEFS[theme]}\nTone: ${TONE_BLURBS[tone]}\nReturn just the post text — no preamble, no explanation, no surrounding quotes.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.85,
        max_tokens: 350,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[marketing/generate] OpenAI error', res.status, body.slice(0, 300))
      return null
    }

    const data = await res.json() as OpenAIChatResponse
    const content = data.choices?.[0]?.message?.content?.trim()
    return content && content.length > 0 ? content : null
  } catch (err) {
    console.error('[marketing/generate] OpenAI request failed:', err)
    return null
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { theme?: string; tone?: string }
  const theme = body.theme as MarketingTheme | undefined
  const tone = body.tone as PostTone | undefined

  if (!theme || !VALID_THEMES.has(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }
  if (!tone || !VALID_TONES.includes(tone)) {
    return NextResponse.json({ error: 'Invalid tone' }, { status: 400 })
  }

  const aiContent = await generateWithOpenAI(theme, tone)
  if (aiContent) {
    return NextResponse.json({ content: aiContent, source: 'openai' })
  }

  // Graceful fallback — works without an OPENAI_API_KEY so the demo still functions.
  return NextResponse.json({ content: generateAiPost(theme, tone), source: 'template' })
}
