'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Calendar, Users, BarChart2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useMarketingStore } from '@/store/useMarketingStore'
import { AiPostGenerator } from '@/components/marketing/AiPostGenerator'
import { GroupScheduler } from '@/components/marketing/GroupScheduler'
import { formatDate, cn } from '@/lib/utils'
import { getWeek } from 'date-fns'

const THEME_COLORS: Record<string, string> = {
  'social-proof': 'bg-indigo-500/20 text-indigo-300',
  'promo-discount': 'bg-violet-500/20 text-violet-300',
  'tips': 'bg-emerald-500/20 text-emerald-300',
  'before-after': 'bg-amber-500/20 text-amber-300',
  'seasonal-spring': 'bg-teal-500/20 text-teal-300',
  'seasonal-summer': 'bg-yellow-500/20 text-yellow-300',
  'seasonal-fall': 'bg-orange-500/20 text-orange-300',
  'seasonal-winter': 'bg-sky-500/20 text-sky-300',
  'promo-referral': 'bg-pink-500/20 text-pink-300',
  'holiday': 'bg-red-500/20 text-red-300',
}

const STATUS_COLORS = { draft: 'neutral', scheduled: 'default', sent: 'success' } as const

export default function MarketingPage() {
  const { posts, generateAllPosts, generatingAll, generateAllProgress, selectedGroupIds, groups } = useMarketingStore()
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)
  const currentWeek = getWeek(new Date())

  const sentCount = posts.filter(p => p.status === 'sent').length
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length
  const totalReach = groups.filter(g => selectedGroupIds.has(g.id)).reduce((s, g) => s + g.memberCount, 0)

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Posts Sent', value: sentCount, icon: BarChart2, color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]' },
          { label: 'Scheduled', value: scheduledCount, icon: Calendar, color: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.12)]' },
          { label: 'Groups Selected', value: selectedGroupIds.size, icon: Users, color: 'text-violet-400', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.12)]' },
          { label: 'Est. Reach', value: `${(totalReach/1000).toFixed(0)}k`, icon: Zap, color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.12)]' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className={`kpi-card rounded-xl p-4 ${s.glow}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">{s.value}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a2537]">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 52-Week Calendar (left, 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>52-Week Content Calendar</CardTitle>
                <Button
                  size="sm"
                  variant={generatingAll ? 'secondary' : 'default'}
                  onClick={generateAllPosts}
                  disabled={generatingAll}
                >
                  {generatingAll ? (
                    <><span className="animate-spin mr-1">⟳</span> {generateAllProgress}/52</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Generate All 52</>
                  )}
                </Button>
              </div>
              {generatingAll && <Progress value={(generateAllProgress / 52) * 100} className="mt-2" color="bg-indigo-500" />}
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {posts.map((post) => {
                  const isCurrent = post.weekNumber === currentWeek
                  const isExpanded = expandedWeek === post.weekNumber
                  return (
                    <div
                      key={post.id}
                      className={cn(
                        'border-b border-[#1e2a3a] last:border-0 transition-colors',
                        isCurrent && 'bg-indigo-500/[0.04]'
                      )}
                    >
                      <button
                        onClick={() => setExpandedWeek(isExpanded ? null : post.weekNumber)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <span className={cn('w-8 text-xs font-mono font-bold', isCurrent ? 'text-indigo-400' : 'text-slate-600')}>
                          W{post.weekNumber}
                        </span>
                        <span className="text-xs text-slate-500 w-24 flex-shrink-0">
                          {formatDate(post.scheduledDate)}
                        </span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0', THEME_COLORS[post.theme] || 'bg-[#1a2537] text-slate-400')}>
                          {post.theme.replace(/-/g, ' ')}
                        </span>
                        <span className="flex-1 text-xs text-slate-500 truncate">{post.content.split('\n')[0]}</span>
                        <Badge variant={STATUS_COLORS[post.status] || 'neutral'} className="text-[10px] flex-shrink-0 capitalize">
                          {post.status}
                        </Badge>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pl-16">
                              <div className="rounded-xl bg-[#070b14] border border-[#1e2a3a] p-4">
                                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{post.content}</p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {post.hashtags.map(h => (
                                    <span key={h} className="text-xs text-indigo-400">{h}</span>
                                  ))}
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                                  <span>Est. engagement: {post.engagementEstimate} interactions</span>
                                  <span>{post.targetGroupIds.length} groups</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <AiPostGenerator />
          <GroupScheduler />
        </div>
      </div>
    </div>
  )
}
