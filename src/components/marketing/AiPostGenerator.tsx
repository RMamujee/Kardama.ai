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
  const { selectedTheme, selectedTone, generatingPost, generatedContent, generateAiPost, setTheme, setTone, setGeneratedContent } = useMarketingStore()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!generatedContent) return
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-[#0d1321] border-[#1e2a3a]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <CardTitle>AI Post Generator</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-slate-400">Theme</Label>
          <Select value={selectedTheme} onChange={e => setTheme(e.target.value as MarketingTheme)} className="mt-1">
            {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-400">Tone</Label>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  selectedTone === t.value
                    ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300'
                    : 'border-[#1e2a3a] text-slate-500 hover:border-[#2d3f56] hover:text-slate-400'
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
          <div className="relative rounded-xl bg-[#070b14] border border-[#1e2a3a] p-3">
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{generatedContent}</p>
            <button
              onClick={handleCopy}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-[#111827] px-2 py-1 text-[10px] font-medium text-slate-400 border border-[#1e2a3a] hover:bg-[#162032] transition-colors"
            >
              {copied ? <><CheckCircle className="h-3 w-3 text-emerald-400" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
