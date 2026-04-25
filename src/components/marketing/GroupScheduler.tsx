'use client'
import { Users, CheckSquare, Square, Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useMarketingStore } from '@/store/useMarketingStore'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  'local-community': '🏘️ Community',
  'home-services': '🏠 Home Services',
  'neighborhood': '📍 Neighborhood',
  'parenting': '👨‍👩‍👧 Parenting',
}

export function GroupScheduler() {
  const { groups, selectedGroupIds, selectGroup, selectAllGroups, clearGroups } = useMarketingStore()
  const [search, setSearch] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduled, setScheduled] = useState(false)

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.city.toLowerCase().includes(search.toLowerCase())
  )

  const totalReach = groups.filter(g => selectedGroupIds.has(g.id)).reduce((s, g) => s + g.memberCount, 0)

  function handleSchedule() {
    setScheduling(true)
    setTimeout(() => { setScheduling(false); setScheduled(true) }, 2000)
    setTimeout(() => setScheduled(false), 5000)
  }

  return (
    <Card className="bg-[#0d1321] border-[#1e2a3a]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
              <Users className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <CardTitle>Group Scheduler</CardTitle>
          </div>
          <Badge variant="default">{selectedGroupIds.size}/{groups.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Search groups or cities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs"
        />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={selectAllGroups}>
            <CheckSquare className="h-3 w-3" /> All
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={clearGroups}>
            <Square className="h-3 w-3" /> None
          </Button>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-lg border border-[#1e2a3a] bg-[#070b14] divide-y divide-[#1e2a3a]">
          {filtered.map(g => (
            <button
              key={g.id}
              onClick={() => selectGroup(g.id)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                selectedGroupIds.has(g.id) ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'
              )}
            >
              <div className={cn('h-3 w-3 rounded flex-shrink-0 border', selectedGroupIds.has(g.id) ? 'bg-indigo-500 border-indigo-500' : 'border-[#2d3f56]')} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-300 truncate">{g.name}</p>
                <p className="text-[10px] text-slate-600">{g.city} · {(g.memberCount/1000).toFixed(1)}k members</p>
              </div>
              <span className="text-[9px] text-slate-600">{CATEGORY_LABELS[g.category]}</span>
            </button>
          ))}
        </div>

        <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2.5 text-xs text-slate-400">
          Est. reach: <span className="font-semibold text-violet-300">{(totalReach/1000).toFixed(0)}k members</span>
        </div>

        <Button
          className="w-full"
          variant={scheduled ? 'secondary' : 'default'}
          onClick={handleSchedule}
          disabled={scheduling || selectedGroupIds.size === 0}
        >
          {scheduling ? (
            <><span className="animate-spin">⟳</span> Scheduling {selectedGroupIds.size} groups...</>
          ) : scheduled ? (
            <><span>✓</span> Scheduled to {selectedGroupIds.size} groups!</>
          ) : (
            <><Send className="h-4 w-4" /> Schedule to {selectedGroupIds.size} Groups</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
