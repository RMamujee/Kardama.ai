'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe2, Camera, Users, CalendarDays, Hash, Send,
  Clock, CheckCircle2, Trash2, ChevronDown, Eye,
} from 'lucide-react'
import { format, addHours } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useSocialStore } from '@/store/useSocialStore'
import { useMarketingStore } from '@/store/useMarketingStore'
import { ComposerPlatform } from '@/types'
import { cn } from '@/lib/utils'

const PLATFORM_OPTIONS: { value: ComposerPlatform; label: string; icon: React.ElementType; color: string; bg: string; limit: number }[] = [
  { value: 'facebook-groups', label: 'Facebook Groups', icon: Users,  color: 'text-violet-400', bg: 'bg-violet-500/15', limit: 5000 },
  { value: 'facebook-page',   label: 'Facebook Page',   icon: Globe2, color: 'text-violet-400', bg: 'bg-violet-500/15', limit: 5000 },
  { value: 'instagram',       label: 'Instagram',       icon: Camera, color: 'text-pink-500',   bg: 'bg-pink-500/15',   limit: 2200 },
]

const HASHTAG_SUGGESTIONS = [
  '#LongBeachCleaning', '#SouthBayCleaning', '#HomeCleaning', '#HouseCleaningService',
  '#DeepClean', '#CleanHome', '#LongBeach', '#Torrance', '#ElSegundo', '#ManhattanBeach',
  '#RedondoBeach', '#SouthBay', '#KardamaClean', '#MoveOutClean', '#AirbnbCleaning',
  '#SpringCleaning', '#BeforeAndAfter', '#CleaningService',
]

const QUICK_SLOTS = [
  { label: 'In 1 hour', value: () => addHours(new Date(), 1) },
  { label: 'Tomorrow 9am', value: () => { const d = addHours(new Date(), 24); d.setHours(9, 0, 0, 0); return d } },
  { label: 'Tomorrow 6pm', value: () => { const d = addHours(new Date(), 24); d.setHours(18, 0, 0, 0); return d } },
]

export function PostComposer() {
  const { addScheduledPost, scheduledPosts, removeScheduledPost, markPostSent } = useSocialStore()
  const { groups, selectedGroupIds, selectGroup, selectAllGroups, clearGroups } = useMarketingStore()

  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<ComposerPlatform>>(new Set(['facebook-groups']))
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null)
  const [showGroups, setShowGroups] = useState(false)
  const [showHashtags, setShowHashtags] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [activePreview, setActivePreview] = useState<ComposerPlatform>('facebook-groups')

  const togglePlatform = (p: ComposerPlatform) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  const toggleHashtag = (tag: string) => {
    setHashtags(prev => prev.includes(tag) ? prev.filter(h => h !== tag) : [...prev, tag])
  }

  const fullContent = content + (hashtags.length ? '\n\n' + hashtags.join(' ') : '')
  const charLimit = selectedPlatforms.has('instagram') ? 2200 : 5000
  const charCount = fullContent.length
  const charPct = Math.min((charCount / charLimit) * 100, 100)

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    g.city.toLowerCase().includes(groupSearch.toLowerCase())
  )

  function handlePost() {
    if (!content.trim()) return
    setPosting(true)
    setTimeout(() => {
      addScheduledPost({
        content: fullContent,
        platforms: Array.from(selectedPlatforms),
        targetGroupIds: selectedPlatforms.has('facebook-groups') ? Array.from(selectedGroupIds) : [],
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : new Date().toISOString(),
        hashtags,
      })
      setPosting(false)
      setPosted(true)
      setContent('')
      setHashtags([])
      setScheduledAt(null)
      setTimeout(() => setPosted(false), 3000)
    }, 1200)
  }

  const totalReach = groups.filter(g => selectedGroupIds.has(g.id)).reduce((s, g) => s + g.memberCount, 0)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Composer (left, 3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20">
                <Send className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <CardTitle>Post Composer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platform selector */}
            <div>
              <p className="text-[12px] font-medium text-ink-400 mb-2">Post to</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(p => {
                  const Icon = p.icon
                  const active = selectedPlatforms.has(p.value)
                  return (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                        active
                          ? `${p.bg} ${p.color} border-transparent`
                          : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Group selector (only when fb-groups selected) */}
            {selectedPlatforms.has('facebook-groups') && (
              <div className="rounded-xl border border-ink-200 overflow-hidden">
                <button
                  onClick={() => setShowGroups(g => !g)}
                  className="flex w-full items-center justify-between px-4 py-3 text-[12px] font-medium text-ink-700 hover:bg-hover transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-purple-500" />
                    Target Groups
                    <Badge variant="default" className="text-[11px]">{selectedGroupIds.size} selected · {(totalReach/1000).toFixed(0)}k reach</Badge>
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', showGroups && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {showGroups && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-ink-200"
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search groups..."
                            value={groupSearch}
                            onChange={e => setGroupSearch(e.target.value)}
                            className="text-[12px] flex-1"
                          />
                          <Button variant="outline" size="sm" className="text-[12px]" onClick={selectAllGroups}>All</Button>
                          <Button variant="outline" size="sm" className="text-[12px]" onClick={clearGroups}>None</Button>
                        </div>
                        <div className="max-h-40 overflow-y-auto rounded-lg bg-page border border-ink-200 divide-y divide-ink-200">
                          {filteredGroups.map(g => (
                            <button
                              key={g.id}
                              onClick={() => selectGroup(g.id)}
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors',
                                selectedGroupIds.has(g.id) ? 'bg-violet-500/10' : 'hover:bg-hover'
                              )}
                            >
                              <div className={cn('h-3 w-3 rounded flex-shrink-0 border', selectedGroupIds.has(g.id) ? 'bg-violet-500 border-violet-500' : 'border-ink-100')} />
                              <span className="flex-1 text-ink-700 truncate">{g.name}</span>
                              <span className="text-[11px] text-ink-400">{(g.memberCount/1000).toFixed(1)}k</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Text editor */}
            <div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={7}
                placeholder="Write your post here... Use [Name] and [City] as placeholders."
                className="w-full rounded-xl bg-page border border-ink-200 px-3 py-2.5 text-[14px] text-ink-700 placeholder:text-ink-400 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-400">
                <span>{charCount}/{charLimit} chars</span>
                <div className="h-1.5 w-24 rounded-full bg-ink-200 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', charPct > 90 ? 'bg-rose-500' : charPct > 70 ? 'bg-amber-500' : 'bg-violet-500')}
                    style={{ width: `${charPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Hashtags */}
            <div className="rounded-xl border border-ink-200 overflow-hidden">
              <button
                onClick={() => setShowHashtags(h => !h)}
                className="flex w-full items-center justify-between px-4 py-3 text-[12px] font-medium text-ink-700 hover:bg-hover transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-violet-400" />
                  Hashtags
                  {hashtags.length > 0 && <Badge variant="default" className="text-[11px]">{hashtags.length} selected</Badge>}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', showHashtags && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {showHashtags && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-ink-200"
                  >
                    <div className="p-3 flex flex-wrap gap-1.5">
                      {HASHTAG_SUGGESTIONS.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleHashtag(tag)}
                          className={cn(
                            'rounded-lg border px-2 py-1 text-[12px] font-medium transition-colors',
                            hashtags.includes(tag)
                              ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                              : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Schedule */}
            <div>
              <p className="text-[12px] font-medium text-ink-400 mb-2 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-ink-500" />
                Schedule
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setScheduledAt(null)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                    !scheduledAt
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-500'
                      : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                  )}
                >
                  Post Now
                </button>
                {QUICK_SLOTS.map(slot => (
                  <button
                    key={slot.label}
                    onClick={() => setScheduledAt(slot.value())}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                      scheduledAt && format(scheduledAt, 'yyyy-MM-dd HH') === format(slot.value(), 'yyyy-MM-dd HH')
                        ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                        : 'border-ink-200 text-ink-500 hover:border-ink-100 hover:text-ink-700'
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
              {scheduledAt && (
                <p className="mt-1.5 text-[11px] text-violet-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Scheduled for {format(scheduledAt, 'MMM d, h:mm a')}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handlePost}
              disabled={posting || posted || !content.trim() || selectedPlatforms.size === 0}
            >
              {posted ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {scheduledAt ? 'Scheduled!' : 'Posted!'}</>
              ) : posting ? (
                <><span className="animate-spin">⟳</span> {scheduledAt ? 'Scheduling...' : 'Posting...'}</>
              ) : (
                <><Send className="h-4 w-4" /> {scheduledAt ? `Schedule to ${selectedPlatforms.size} platform${selectedPlatforms.size > 1 ? 's' : ''}` : `Post Now to ${selectedPlatforms.size} platform${selectedPlatforms.size > 1 ? 's' : ''}`}</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview + Queue (right, 2 cols) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-elev">
                  <Eye className="h-3.5 w-3.5 text-ink-400" />
                </div>
                <CardTitle>Preview</CardTitle>
              </div>
              <div className="flex gap-1">
                {PLATFORM_OPTIONS.filter(p => selectedPlatforms.has(p.value)).map(p => {
                  const Icon = p.icon
                  return (
                    <button
                      key={p.value}
                      onClick={() => setActivePreview(p.value)}
                      className={cn(
                        'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                        activePreview === p.value
                          ? `${p.bg} ${p.color} border-transparent`
                          : 'border-ink-200 text-ink-400 hover:text-ink-700'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {p.value === 'facebook-groups' ? 'Groups' : p.value === 'facebook-page' ? 'FB Page' : 'IG'}
                    </button>
                  )
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'rounded-xl border p-4 min-h-[160px] bg-page',
              activePreview === 'instagram' ? 'border-pink-500/20' : 'border-violet-500/20'
            )}>
              {/* Platform chrome */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ink-200">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">KC</div>
                <div>
                  <p className="text-[12px] font-semibold text-ink-900">Kardama Clean</p>
                  <p className="text-[11px] text-ink-500">
                    {activePreview === 'facebook-groups' ? `Posting to ${selectedGroupIds.size} groups` :
                     activePreview === 'facebook-page' ? 'Facebook Page' : 'Instagram'}
                  </p>
                </div>
              </div>

              {content || hashtags.length ? (
                <p className="text-[12px] text-ink-700 leading-relaxed whitespace-pre-line">
                  {fullContent || <span className="text-ink-400 italic">Your post will appear here...</span>}
                </p>
              ) : (
                <p className="text-[12px] text-ink-400 italic">Start typing to see a preview...</p>
              )}

              {activePreview === 'facebook-groups' && selectedGroupIds.size > 0 && (
                <div className="mt-3 pt-3 border-t border-ink-200 flex items-center gap-2 text-[11px] text-ink-400">
                  <Users className="h-3 w-3 text-purple-500" />
                  <span className="text-purple-500">{(totalReach/1000).toFixed(0)}k</span> estimated reach
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled queue */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <CardTitle>Post Queue</CardTitle>
              <Badge variant="neutral" className="text-[11px]">{scheduledPosts.filter(p => p.status === 'queued').length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {scheduledPosts.length === 0 ? (
              <p className="text-[12px] text-ink-400 text-center py-4">No posts queued yet</p>
            ) : (
              scheduledPosts.map(post => {
                const isQueued = post.status === 'queued'
                return (
                  <div
                    key={post.id}
                    className={cn(
                      'rounded-xl border p-3 transition-colors',
                      isQueued ? 'border-ink-200 bg-page' : 'border-emerald-500/20 bg-emerald-500/[0.04] opacity-70'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {(post.platforms as ComposerPlatform[]).map(p => {
                            const cfg = PLATFORM_OPTIONS.find(o => o.value === p)
                            if (!cfg) return null
                            const Icon = cfg.icon
                            return (
                              <span key={p} className={cn('flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium', cfg.bg, cfg.color)}>
                                <Icon className="h-2.5 w-2.5" />
                                {p === 'facebook-groups' ? 'Groups' : p === 'facebook-page' ? 'FB' : 'IG'}
                              </span>
                            )
                          })}
                          {isQueued ? (
                            <span className="rounded-full px-1.5 py-0.5 text-[11px] font-medium bg-amber-500/15 text-amber-500">Queued</span>
                          ) : (
                            <span className="rounded-full px-1.5 py-0.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-500">Sent</span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-400 line-clamp-2 leading-relaxed">{post.content}</p>
                        <p className="mt-1 text-[11px] text-ink-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(post.scheduledAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {isQueued && (
                          <button
                            onClick={() => markPostSent(post.id)}
                            className="text-emerald-500 hover:text-emerald-500/80 transition-colors"
                            title="Mark as sent"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeScheduledPost(post.id)}
                          className="text-ink-400 hover:text-rose-500 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
