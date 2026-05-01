'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Globe2, Camera, Zap, Loader2, CheckCircle2, AlertTriangle, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ScraperSource = 'google-maps' | 'yelp' | 'instagram' | 'facebook-pages'

interface ScraperConfig {
  source: ScraperSource
  label: string
  description: string
  Icon: React.ElementType
  color: string
  bg: string
  needsKeyword: boolean
  needsCity: boolean
  needsHashtag: boolean
}

const SCRAPERS: ScraperConfig[] = [
  {
    source: 'google-maps',
    label: 'Google Maps',
    description: 'Local businesses by city + keyword (Google Places API)',
    Icon: MapPin,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    needsKeyword: true,
    needsCity: true,
    needsHashtag: false,
  },
  {
    source: 'yelp',
    label: 'Yelp',
    description: 'Competitor cleaners & businesses (Yelp Fusion API)',
    Icon: Globe2,
    color: 'text-rose-500',
    bg: 'bg-rose-500/15',
    needsKeyword: true,
    needsCity: true,
    needsHashtag: false,
  },
  {
    source: 'instagram',
    label: 'Instagram',
    description: 'Posts by hashtag, e.g. airbnbhost (Apify)',
    Icon: Camera,
    color: 'text-pink-500',
    bg: 'bg-pink-500/15',
    needsKeyword: false,
    needsCity: false,
    needsHashtag: true,
  },
  {
    source: 'facebook-pages',
    label: 'Facebook Pages',
    description: 'Property mgmt & real estate pages (Apify)',
    Icon: Globe2,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    needsKeyword: true,
    needsCity: true,
    needsHashtag: false,
  },
]

interface RunState {
  status: 'idle' | 'running' | 'success' | 'error'
  message?: string
}

export function ScraperPanel() {
  const [city, setCity] = useState('Long Beach, CA')
  const [keyword, setKeyword] = useState('property management')
  const [hashtag, setHashtag] = useState('airbnbhost')
  const [limit, setLimit] = useState(30)
  const [runs, setRuns] = useState<Record<ScraperSource, RunState>>({
    'google-maps':    { status: 'idle' },
    'yelp':           { status: 'idle' },
    'instagram':      { status: 'idle' },
    'facebook-pages': { status: 'idle' },
  })

  async function trigger(source: ScraperSource) {
    setRuns(s => ({ ...s, [source]: { status: 'running' } }))
    try {
      const res = await fetch('/api/leads/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, city, keyword, hashtag, limit }),
      })
      const json = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setRuns(s => ({ ...s, [source]: { status: 'error', message: json.error ?? `HTTP ${res.status}` } }))
        return
      }
      setRuns(s => ({ ...s, [source]: { status: 'success', message: 'Scraper kicked off — leads will appear in the monitor as they land.' } }))
      setTimeout(() => {
        setRuns(s => ({ ...s, [source]: { status: 'idle' } }))
      }, 6000)
    } catch (err) {
      setRuns(s => ({ ...s, [source]: { status: 'error', message: err instanceof Error ? err.message : 'Network error' } }))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <CardTitle>Lead Sources</CardTitle>
          <span className="text-[11px] text-ink-400">— runs in n8n, results land in Lead Monitor</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[12px] font-medium text-ink-400 mb-1.5">City / area</p>
            <Input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Long Beach, CA"
              className="text-[12px]"
            />
          </div>
          <div>
            <p className="text-[12px] font-medium text-ink-400 mb-1.5">Keyword (Google / Yelp / FB)</p>
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="property management"
              className="text-[12px]"
            />
          </div>
          <div>
            <p className="text-[12px] font-medium text-ink-400 mb-1.5">Instagram hashtag (no #)</p>
            <Input
              value={hashtag}
              onChange={e => setHashtag(e.target.value.replace(/^#/, ''))}
              placeholder="airbnbhost"
              className="text-[12px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[12px] font-medium text-ink-400">Result limit</p>
          <input
            type="range"
            min={10}
            max={100}
            step={10}
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value))}
            className="flex-1 max-w-[280px]"
          />
          <span className="text-[12px] text-ink-700 w-8 num">{limit}</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCRAPERS.map(s => {
            const run = runs[s.source]
            const Icon = s.Icon
            const isRunning = run.status === 'running'
            const isSuccess = run.status === 'success'
            const isError = run.status === 'error'
            return (
              <motion.div
                key={s.source}
                layout
                className={cn(
                  'rounded-xl border p-3 transition-colors',
                  isSuccess && 'border-emerald-500/40 bg-emerald-500/[0.04]',
                  isError && 'border-rose-500/40 bg-rose-500/[0.04]',
                  !isSuccess && !isError && 'border-ink-200 bg-card',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', s.bg, s.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink-900">{s.label}</p>
                    <p className="text-[11.5px] text-ink-500 leading-snug">{s.description}</p>
                    {run.message && (
                      <p className={cn(
                        'mt-1.5 text-[11px] leading-snug',
                        isSuccess && 'text-emerald-500',
                        isError && 'text-rose-500',
                      )}>
                        {isSuccess && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                        {isError && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                        {run.message}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => trigger(s.source)}
                    disabled={isRunning}
                    className="flex-shrink-0"
                  >
                    {isRunning ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running</>
                    ) : (
                      <>{s.needsHashtag ? <Hash className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />} Run now</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>

        <p className="text-[11px] text-ink-400 leading-relaxed">
          Each scraper also runs on a daily schedule in n8n. New leads upsert into the same table the Lead Monitor reads from — refresh the monitor after a run to see them.
        </p>
      </CardContent>
    </Card>
  )
}
