'use client'
import { Sparkles, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMarketingStore } from '@/store/useMarketingStore'
import { MarketingTheme } from '@/types'
import { PostTone } from '@/lib/marketing-engine'

const THEMES: { value: MarketingTheme; label: string }[] = [
  { value: 'social-proof', label: 'Social Proof (Testimonials)' },
  { value: 'promo-discount', label: 'Promotion / Discount' },
  { value: 'tips', label: 'Cleaning Tips' },
  { value: 'before-after', label: 'Before & After' },
  { value: 'promo-referral', label: 'Referral Program' },
  { value: 'seasonal-spring', label: 'Spring Seasonal' },
  { value: 'seasonal-summer', label: 'Summer Seasonal' },
  { value: 'seasonal-fall', label: 'Fall Seasonal' },
  { value: 'seasonal-winter', label: 'Winter / Holiday' },
  { value: 'holiday', label: 'Holiday Special' },
]

const TONES: { value: PostTone; label: string }[] = [
  { value: 'friendly', label: '😊 Friendly & Casual' },
  { value: 'professional', label: '💼 Professional' },
  { value: 'urgent', label: '🔥 Urgent / FOMO' },
  { value: 'seasonal', label: '🌟 Seasonal Vibe' },
]

export function AiPostGenerator() {
  const { selectedTheme, selectedTone, generatingPost, generatedContent, generatedSource, generateAiPost, setTheme, setTone, setGeneratedContent } = useMarketingStore()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!generatedContent) return
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <CardTitle>AI Post Generator</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-[12px] text-ink-400">Theme</Label>
          <Select value={selectedTheme} onChange={e => setTheme(e.target.value as MarketingTheme)} className="mt-1">
            {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <div>
          <Label className="text-[12px] text-ink-400">Tone</Label>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`rounded-lg border px-2 py-1.5 text-[12px] font-medium transition-colors ${
                  selectedTone === t.value
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                    : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={generateAiPost} disabled={generatingPost}>
          {generatingPost ? (
            <><span className="animate-spin">⟳</span> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Generate Post</>
          )}
        </Button>

        {generatedContent && (
          <div className="relative rounded-xl bg-page border border-ink-200 p-3">
            <p className="text-[12px] text-ink-700 whitespace-pre-line leading-relaxed">{generatedContent}</p>
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              {generatedSource === 'openai' ? (
                <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-500 border border-emerald-500/30">
                  GPT-4o
                </span>
              ) : generatedSource === 'template' ? (
                <span className="rounded-md bg-elev px-2 py-1 text-[11px] font-semibold text-ink-400 border border-ink-200">
                  Template
                </span>
              ) : null}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-md bg-elev px-2 py-1 text-[11px] font-medium text-ink-400 border border-ink-200 hover:bg-hover hover:text-ink-700 transition-colors"
              >
                {copied ? <><CheckCircle className="h-3 w-3 text-emerald-500" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
