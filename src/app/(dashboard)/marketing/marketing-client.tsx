'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Calendar, Users, BarChart2, Zap,
  Eye, Send, Copy, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatTile } from '@/components/ui/stat-tile'
import { useMarketingStore } from '@/store/useMarketingStore'
import { useSocialStore } from '@/store/useSocialStore'
import { AiPostGenerator } from '@/components/marketing/AiPostGenerator'
import { GroupScheduler } from '@/components/marketing/GroupScheduler'
import { LeadMonitor } from '@/components/marketing/LeadMonitor'
import { PostComposer } from '@/components/marketing/PostComposer'
import { ResponseTemplates } from '@/components/marketing/ResponseTemplates'
import { formatDate, cn } from '@/lib/utils'
import { getWeek } from 'date-fns'

const THEME_COLORS: Record<string, string> = {
  'social-proof':     'bg-violet-500/15 text-violet-400',
  'promo-discount':   'bg-purple-500/15 text-purple-500',
  'tips':             'bg-emerald-500/15 text-emerald-500',
  'before-after':     'bg-amber-500/15 text-amber-500',
  'seasonal-spring':  'bg-teal-500/15 text-teal-500',
  'seasonal-summer':  'bg-amber-500/15 text-amber-500',
  'seasonal-fall':    'bg-amber-500/15 text-amber-500',
  'seasonal-winter':  'bg-violet-500/15 text-violet-400',
  'promo-referral':   'bg-pink-500/15 text-pink-500',
  'holiday':          'bg-rose-500/15 text-rose-500',
}

const STATUS_COLORS = { draft: 'neutral', scheduled: 'default', sent: 'success' } as const

function OverviewTab() {
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
          { label: 'Posts Sent', value: sentCount, icon: BarChart2, tone: 'emerald' as const },
          { label: 'Scheduled', value: scheduledCount, icon: Calendar, tone: 'violet' as const },
          { label: 'Groups', value: selectedGroupIds.size, icon: Users, tone: 'purple' as const },
          { label: 'Est. Reach', value: `${(totalReach/1000).toFixed(0)}k`, icon: Zap, tone: 'amber' as const },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatTile label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 52-Week Calendar */}
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
              {generatingAll && <Progress value={(generateAllProgress / 52) * 100} className="mt-2" color="bg-violet-500" />}
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {posts.map((post) => {
                  const isCurrent = post.weekNumber === currentWeek
                  const isExpanded = expandedWeek === post.weekNumber
                  return (
                    <div
                      key={post.id}
                      className={cn('border-b border-ink-200 last:border-0 transition-colors', isCurrent && 'bg-violet-500/[0.04]')}
                    >
                      <button
                        onClick={() => setExpandedWeek(isExpanded ? null : post.weekNumber)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-hover transition-colors"
                      >
                        <span className={cn('w-8 font-mono font-bold tnum text-[12px]', isCurrent ? 'text-violet-400' : 'text-ink-300')}>
                          W{post.weekNumber}
                        </span>
                        <span className="text-ink-500 w-24 flex-shrink-0 text-[12px]">{formatDate(post.scheduledDate)}</span>
                        <span className={cn('rounded-full px-2 py-0.5 font-medium flex-shrink-0 text-[11px]', THEME_COLORS[post.theme] || 'bg-elev text-ink-400')}>
                          {post.theme.replace(/-/g, ' ')}
                        </span>
                        <span className="flex-1 text-ink-500 truncate text-[12px]">{post.content.split('\n')[0]}</span>
                        <Badge variant={STATUS_COLORS[post.status] || 'neutral'} className="flex-shrink-0 capitalize">
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
                              <div className="rounded-xl bg-page border border-ink-200 p-4">
                                <p className="text-[13px] text-ink-700 whitespace-pre-line leading-relaxed">{post.content}</p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {post.hashtags.map(h => (
                                    <span key={h} className="text-violet-400 text-[12px]">{h}</span>
                                  ))}
                                </div>
                                <div className="mt-3 flex items-center justify-between text-ink-400 text-[12px]">
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

        {/* Right side */}
        <div className="lg:col-span-2 space-y-4">
          <AiPostGenerator />
          <GroupScheduler />
        </div>
      </div>
    </div>
  )
}

export function MarketingClient() {
  const { leads } = useSocialStore()
  const newLeads = leads.filter(l => l.status === 'new').length
  const urgentLeads = leads.filter(l => l.status === 'new' && l.urgency === 'high').length

  return (
    <div className="space-y-7 max-w-7xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-ink-900">Social Media Marketing</h1>
          <p className="text-[13px] text-ink-500 mt-1">Find leads, post to groups, and manage your social presence</p>
        </div>
        {urgentLeads > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5"
          >
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[13px] font-medium text-rose-500">
              {urgentLeads} urgent lead{urgentLeads > 1 ? 's' : ''} waiting
            </span>
          </motion.div>
        )}
      </div>

      <Tabs defaultValue="leads">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="leads" className="relative">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Lead Monitor
            {newLeads > 0 && (
              <span className="ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 font-bold text-white text-[11px]">
                {newLeads}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="compose">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Compose &amp; Schedule
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="overview">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Content Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <LeadMonitor />
        </TabsContent>

        <TabsContent value="compose">
          <PostComposer />
        </TabsContent>

        <TabsContent value="templates">
          <ResponseTemplates />
        </TabsContent>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
