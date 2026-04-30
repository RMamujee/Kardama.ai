'use client'
import { useState } from 'react'
import { Copy, CheckCircle, Globe2, Camera, MapPin, MessageCircle, Search, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSocialStore } from '@/store/useSocialStore'
import { ResponseTemplate, TemplateCategory, LeadPlatform } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; color: string; bg: string }> = {
  intro:        { label: 'Introduction', color: 'text-violet-400', bg: 'bg-violet-500/15' },
  promo:        { label: 'Promotion',    color: 'text-purple-500', bg: 'bg-purple-500/15' },
  'follow-up':  { label: 'Follow-Up',    color: 'text-amber-500',  bg: 'bg-amber-500/15' },
  'group-post': { label: 'Group Posts',  color: 'text-teal-500',   bg: 'bg-teal-500/15' },
  instagram:    { label: 'Instagram',    color: 'text-pink-500',   bg: 'bg-pink-500/15' },
}

const PLATFORM_ICONS: Record<LeadPlatform, React.ElementType> = {
  'facebook-group': Globe2,
  'facebook-page': Globe2,
  'instagram': Camera,
  'nextdoor': MapPin,
  'messenger': MessageCircle,
}

const CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'intro', label: 'Intros' },
  { value: 'promo', label: 'Promos' },
  { value: 'follow-up', label: 'Follow-Ups' },
  { value: 'group-post', label: 'Group Posts' },
  { value: 'instagram', label: 'Instagram' },
]

function TemplateCard({ template }: { template: ResponseTemplate }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORY_CONFIG[template.category]

  function handleCopy() {
    navigator.clipboard.writeText(template.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-card overflow-hidden transition-colors hover:border-ink-100">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', cat.bg, cat.color)}>
                {cat.label}
              </span>
              {template.platforms.map(p => {
                const Icon = PLATFORM_ICONS[p]
                return (
                  <span key={p} className="flex items-center gap-1 rounded-full bg-elev px-1.5 py-0.5 text-[11px] text-ink-400">
                    <Icon className="h-2.5 w-2.5" />
                    {p === 'facebook-group' ? 'FB Group' : p === 'facebook-page' ? 'FB Page' : p === 'instagram' ? 'IG' : 'Nextdoor'}
                  </span>
                )
              })}
            </div>
            <h4 className="text-[13px] font-semibold text-ink-900">{template.title}</h4>
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[11px] font-medium text-ink-400 hover:bg-hover hover:text-ink-900 transition-colors"
          >
            {copied ? (
              <><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Copied!</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Copy</>
            )}
          </button>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.map(tag => (
              <span key={tag} className="flex items-center gap-0.5 text-[11px] text-ink-400">
                <Tag className="h-2.5 w-2.5" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Preview */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-left"
        >
          <p className={cn('text-[12px] text-ink-500 leading-relaxed whitespace-pre-line transition-all', !expanded && 'line-clamp-2')}>
            {template.content}
          </p>
          <span className="mt-1 text-[11px] text-violet-400 hover:text-violet-500 transition-colors">
            {expanded ? 'Show less' : 'Show full template'}
          </span>
        </button>
      </div>
    </div>
  )
}

export function ResponseTemplates() {
  const { templates } = useSocialStore()
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = templates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.content.toLowerCase().includes(search.toLowerCase()) &&
        !t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const countsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = cat.value === 'all'
      ? templates.length
      : templates.filter(t => t.category === cat.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {CATEGORIES.filter(c => c.value !== 'all').map(cat => {
          const cfg = CATEGORY_CONFIG[cat.value as TemplateCategory]
          return (
            <div key={cat.value} className="rounded-[14px] border border-ink-200 bg-card p-3">
              <p className="text-[11px] text-ink-500 uppercase tracking-wide">{cat.label}</p>
              <p className={cn('mt-0.5 text-[20px] font-bold tnum', cfg.color)}>{countsByCategory[cat.value]}</p>
            </div>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
              <Copy className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <CardTitle>Response Templates</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-500 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full rounded-lg border border-ink-200 bg-page pl-8 pr-3 py-2 text-[12px] text-ink-700 placeholder:text-ink-400 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors',
                    categoryFilter === cat.value
                      ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                      : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                  )}
                >
                  {cat.label}
                  {countsByCategory[cat.value] > 0 && (
                    <span className="ml-1 text-ink-400">{countsByCategory[cat.value]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map(t => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-10 text-center">
              <Search className="h-8 w-8 text-ink-400 mx-auto mb-3" />
              <p className="text-[13px] text-ink-500">No templates match your search</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
