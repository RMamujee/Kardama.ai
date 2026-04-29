'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import type { Cleaner, CleanerStatus, Job } from '@/types'
import {
  buildOptimizedRoutes, TeamRoute, RouteStop, RealLegOverrides,
} from '@/lib/routing-engine'
import { RealRoute, CONGESTION_COLOR } from '@/lib/google-routing'
import { RoutingPanel } from './RoutingPanel'
import { Crosshair, WifiOff, AlertTriangle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const MAP_ID    = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'

const OVERRIDES_KEY = 'kardama:dispatch:overrides'
function todayStr() { return new Date().toISOString().split('T')[0] }
function loadOverrides(): Record<string, RouteStop['status']> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { date?: string; overrides?: Record<string, RouteStop['status']> }
    if (parsed?.date !== todayStr()) return {}
    return parsed.overrides ?? {}
  } catch { return {} }
}
function saveOverrides(o: Record<string, RouteStop['status']>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify({ date: todayStr(), overrides: o })) } catch {}
}

// ─── Map child components (must be inside <Map>) ─────────────────────────────

function RoutePolylines({ routes, realRoutes }: {
  routes: TeamRoute[]
  realRoutes: Record<string, RealRoute | null>
}) {
  const map = useMap()
  const polysRef = useRef<google.maps.Polyline[]>([])

  useEffect(() => {
    if (!map) return
    polysRef.current.forEach(p => p.setMap(null))
    polysRef.current = []

    const DASH: google.maps.IconSequence = {
      icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
      offset: '0', repeat: '20px',
    }

    for (const route of routes) {
      const real = realRoutes[route.teamId]
      if (real && real.segments.length > 0) {
        for (const seg of real.segments) {
          polysRef.current.push(new google.maps.Polyline({
            path: seg.positions.map(([lat, lng]) => ({ lat, lng })),
            strokeColor: CONGESTION_COLOR[seg.congestion] ?? route.color,
            strokeWeight: 5, strokeOpacity: 0.9, map,
          }))
        }
      } else {
        polysRef.current.push(new google.maps.Polyline({
          path: route.polyline.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: route.color, strokeWeight: 4, strokeOpacity: 0,
          icons: [DASH], map,
        }))
      }
    }
    return () => { polysRef.current.forEach(p => p.setMap(null)) }
  }, [map, routes, realRoutes])

  return null
}

function TrafficLayer({ show }: { show: boolean }) {
  const map = useMap()
  const ref = useRef<google.maps.TrafficLayer | null>(null)
  useEffect(() => {
    if (!map) return
    if (!ref.current) ref.current = new google.maps.TrafficLayer()
    ref.current.setMap(show ? map : null)
    return () => { ref.current?.setMap(null) }
  }, [map, show])
  return null
}

function MapFitBounds({ routes }: { routes: TeamRoute[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (!map || routes.length === 0 || fitted.current) return
    const bounds = new google.maps.LatLngBounds()
    routes.forEach(r => {
      bounds.extend({ lat: r.startLat, lng: r.startLng })
      r.stops.forEach(s => bounds.extend({ lat: s.job.lat, lng: s.job.lng }))
    })
    if (!bounds.isEmpty()) { map.fitBounds(bounds, 60); fitted.current = true }
  }, [map, routes])
  return null
}

function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo(target); map.setZoom(15)
  }, [map, target])
  return null
}

function GpsTrail({ trail }: { trail: [number, number][] }) {
  const map = useMap()
  const ref = useRef<google.maps.Polyline | null>(null)
  useEffect(() => {
    if (!map) return
    ref.current = new google.maps.Polyline({
      strokeColor: '#8B85F2', strokeWeight: 3, strokeOpacity: 0,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '15px' }],
      map,
    })
    return () => { ref.current?.setMap(null); ref.current = null }
  }, [map])
  useEffect(() => { ref.current?.setPath(trail.map(([lat, lng]) => ({ lat, lng }))) }, [trail])
  return null
}

// ─── Marker HTML helpers ──────────────────────────────────────────────────────

function StopMarkerEl({ seq, color, status }: { seq: number; color: string; status: RouteStop['status'] }) {
  const dim  = status === 'cancelled'
  const done = status === 'complete'
  const bg   = dim ? '#9ca3af' : done ? '#6b7280' : color
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: bg,
      border: '2.5px solid rgba(255,255,255,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, color: 'white', fontSize: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      fontFamily: '-apple-system,sans-serif',
      opacity: dim ? 0.45 : 1, cursor: 'pointer',
    }}>
      {done ? '✓' : dim ? '×' : seq}
    </div>
  )
}

function TeamBaseEl({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 8, background: color,
      border: '2.5px solid rgba(255,255,255,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, color: 'white', fontSize: 10,
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      fontFamily: '-apple-system,sans-serif',
    }}>
      {initials}
    </div>
  )
}

function CleanerDotEl({ initials, color, status }: { initials: string; color: string; status: CleanerStatus }) {
  const ring = status === 'en-route' ? '#f59e0b' : '#10b981'
  return (
    <div style={{ position: 'relative', width: 38, height: 38 }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', background: color,
        border: `3px solid ${ring}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, color: 'white', fontSize: 11,
        boxShadow: `0 0 0 5px ${ring}35, 0 2px 10px rgba(0,0,0,0.4)`,
        fontFamily: '-apple-system,sans-serif',
      }}>
        {initials}
      </div>
      <span style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 12, height: 12, borderRadius: '50%',
        background: ring, border: '2px solid white',
      }} />
    </div>
  )
}

function GpsDotEl() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      background: '#8B85F2', border: '3px solid white',
      boxShadow: '0 2px 10px rgba(139,133,242,0.6)',
    }} />
  )
}

// ─── Props + component ────────────────────────────────────────────────────────

interface LiveMapViewProps { cleaners: Cleaner[]; todayJobs: Job[] }

export function LiveMapView({ cleaners, todayJobs: jobs }: LiveMapViewProps) {
  const [mounted, setMounted]             = useState(false)
  const [satellite, setSatellite]         = useState(false)
  const [showTraffic, setShowTraffic]     = useState(true)
  const [overrides, setOverrides]         = useState<Record<string, RouteStop['status']>>({})
  const [unavailableTeamIds, setUnavailableTeamIds] = useState<Set<string>>(new Set())
  const [realRoutes, setRealRoutes]       = useState<Record<string, RealRoute | null>>({})
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [routeSource, setRouteSource]     = useState<'cache' | 'computed' | null>(null)
  const [flyTarget, setFlyTarget]         = useState<{ lat: number; lng: number } | null>(null)
  const [gpsPos, setGpsPos]               = useState<{ lat: number; lng: number; accuracy: number; speed: number | null } | null>(null)
  const [gpsTrail, setGpsTrail]           = useState<[number, number][]>([])
  const [gpsTracking, setGpsTracking]     = useState(false)
  const [trackedAs, setTrackedAs]         = useState<string | null>(null)
  const [gpsError, setGpsError]           = useState<string | null>(null)
  const [selectedStopKey, setSelectedStopKey] = useState<string | null>(null)
  const watchRef = useRef<number | null>(null)

  type LivePos = { id: string; initials: string; color: string; name: string; currentLat: number; currentLng: number; status: CleanerStatus; currentJobId: string | null }
  const [livePositions, setLivePositions] = useState<LivePos[]>(() =>
    cleaners.map(c => ({ id: c.id, initials: c.initials, color: c.color, name: c.name, currentLat: c.currentLat, currentLng: c.currentLng, status: c.status, currentJobId: c.currentJobId }))
  )

  useEffect(() => { setOverrides(loadOverrides()); setMounted(true) }, [])

  useEffect(() => {
    setLivePositions(cleaners.map(c => ({
      id: c.id, initials: c.initials, color: c.color, name: c.name,
      currentLat: c.currentLat, currentLng: c.currentLng,
      status: c.status, currentJobId: c.currentJobId,
    })))
  }, [cleaners])

  // Realtime — live cleaner positions + route updates
  useEffect(() => {
    if (!mounted) return
    const supabase = getSupabaseBrowserClient()

    const cleanerCh = supabase.channel('cleaner-positions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cleaners' }, payload => {
        const r = payload.new as { id: string; current_lat: number; current_lng: number; status: CleanerStatus; current_job_id: string | null }
        setLivePositions(prev => prev.map(c => c.id === r.id
          ? { ...c, currentLat: Number(r.current_lat), currentLng: Number(r.current_lng), status: r.status, currentJobId: r.current_job_id }
          : c))
      }).subscribe()

    const routeCh = supabase.channel('daily-routes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_routes' }, payload => {
        const r = payload.new as { team_id: string; segments: RealRoute['segments']; legs: RealRoute['legs'] }
        if (!r?.team_id) return
        setRealRoutes(prev => ({ ...prev, [r.team_id]: { teamId: r.team_id, segments: r.segments, legs: r.legs } }))
      }).subscribe()

    return () => { supabase.removeChannel(cleanerCh); supabase.removeChannel(routeCh) }
  }, [mounted])

  // Compute / load routes on mount
  useEffect(() => {
    if (!mounted) return
    setLoadingRoutes(true)
    fetch('/api/routes/compute', { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { routes: Array<{ teamId: string; segments: RealRoute['segments']; legs: RealRoute['legs'] }>; source: 'cache' | 'computed' } | null) => {
        if (!data?.routes) return
        const map: Record<string, RealRoute | null> = {}
        data.routes.forEach(r => { map[r.teamId] = { teamId: r.teamId, segments: r.segments, legs: r.legs } })
        setRealRoutes(map)
        setRouteSource(data.source)
      })
      .finally(() => setLoadingRoutes(false))
  }, [mounted])

  const todayJobs = useMemo(() =>
    jobs.map(j => overrides[j.id] === 'cancelled' ? { ...j, status: 'cancelled' as const } : j),
    [jobs, overrides])

  const availableCleaners = useMemo(
    () => cleaners.filter(c => !unavailableTeamIds.has(c.teamId)),
    [cleaners, unavailableTeamIds])

  const availableTeamIdList = useMemo(
    () => [...new Set(availableCleaners.map(c => c.teamId))],
    [availableCleaners])

  const redistributedJobs = useMemo(() => {
    if (unavailableTeamIds.size === 0) return todayJobs
    if (availableTeamIdList.length === 0) return todayJobs
    let rrIdx = 0
    return todayJobs.map(job => {
      if (job.status === 'cancelled') return job
      const lead = cleaners.find(c => c.id === job.cleanerIds[0])
      if (!lead || !unavailableTeamIds.has(lead.teamId)) return job
      const newTeamId = availableTeamIdList[rrIdx++ % availableTeamIdList.length]
      const newLead = availableCleaners.find(c => c.teamId === newTeamId)
      if (!newLead) return job
      return { ...job, cleanerIds: [newLead.id, ...job.cleanerIds.slice(1)] }
    })
  }, [todayJobs, cleaners, unavailableTeamIds, availableTeamIdList, availableCleaners])

  const haversineRoutes = useMemo(
    () => buildOptimizedRoutes(redistributedJobs, availableCleaners),
    [redistributedJobs, availableCleaners])

  const routes: TeamRoute[] = useMemo(() => {
    const overridesByTeam: RealLegOverrides = {}
    for (const r of haversineRoutes) {
      const real = realRoutes[r.teamId]
      if (real && real.legs.length === r.stops.length) {
        overridesByTeam[r.teamId] = real.legs.map(leg => ({
          durationMin: leg.durationMin, distanceKm: leg.distanceKm,
          traffic: leg.traffic as 'clear' | 'moderate' | 'heavy' | undefined,
        }))
      }
    }
    return Object.keys(overridesByTeam).length > 0
      ? buildOptimizedRoutes(redistributedJobs, availableCleaners, overridesByTeam)
      : haversineRoutes
  }, [haversineRoutes, redistributedJobs, availableCleaners, realRoutes])

  function setStopStatus(jobId: string, status: RouteStop['status'] | null) {
    setOverrides(prev => {
      const next = { ...prev }
      if (status === null) delete next[jobId]
      else next[jobId] = status
      saveOverrides(next)
      return next
    })
  }

  function startGPS(cleanerId: string | null = null) {
    if (!navigator.geolocation) { setGpsError('GPS not supported'); return }
    setGpsError(null); setGpsTrail([]); setTrackedAs(cleanerId); setGpsTracking(true)
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords
        setGpsPos({ lat, lng, accuracy, speed })
        setGpsTrail(prev => [...prev, [lat, lng]])
      },
      err => {
        const msgs: Record<number, string> = { 1: 'Location denied', 2: 'Position unavailable', 3: 'GPS timed out' }
        setGpsError(msgs[err.code] ?? 'GPS error'); setGpsTracking(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  function stopGPS() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    setGpsTracking(false); setTrackedAs(null); setGpsPos(null); setGpsTrail([])
  }

  function forceRecompute() {
    setLoadingRoutes(true)
    fetch('/api/routes/compute', { method: 'POST', headers: { 'x-force': '1' } })
      .then(r => r.ok ? r.json() : null)
      .then((data: { routes: Array<{ teamId: string; segments: RealRoute['segments']; legs: RealRoute['legs'] }> } | null) => {
        if (!data?.routes) return
        const map: Record<string, RealRoute | null> = {}
        data.routes.forEach(r => { map[r.teamId] = { teamId: r.teamId, segments: r.segments, legs: r.legs } })
        setRealRoutes(map)
      })
      .finally(() => setLoadingRoutes(false))
  }

  if (!mounted) return null

  // Find selected stop for InfoWindow
  const selectedStop = selectedStopKey
    ? routes.flatMap(r => r.stops.map(s => ({ stop: s, route: r }))).find(x => x.stop.job.id === selectedStopKey) ?? null
    : null

  return (
    <div className="flex h-full">
      <RoutingPanel
        routes={routes}
        cleaners={cleaners}
        unavailableTeamIds={unavailableTeamIds}
        onToggleTeamAvailability={id => setUnavailableTeamIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
        overrides={overrides}
        onSetStopStatus={setStopStatus}
        gpsTracking={gpsTracking}
        trackedCleaner={trackedAs}
        onStartGPS={startGPS}
        onStopGPS={stopGPS}
        onFlyTo={(lat, lng) => setFlyTarget({ lat, lng })}
      />

      <div className="relative flex-1 overflow-hidden">
        <APIProvider apiKey={GMAPS_KEY} libraries={['marker']}>
          <Map
            defaultCenter={{ lat: 33.87, lng: -118.26 }}
            defaultZoom={11}
            mapId={MAP_ID}
            mapTypeId={satellite ? 'satellite' : 'roadmap'}
            gestureHandling="greedy"
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            zoomControl={true}
            style={{ width: '100%', height: '100%' }}
          >
            <RoutePolylines routes={routes} realRoutes={realRoutes} />
            <TrafficLayer show={showTraffic} />
            <MapFitBounds routes={routes} />
            <FlyTo target={flyTarget} />
            {gpsTrail.length > 1 && <GpsTrail trail={gpsTrail} />}

            {/* Team base markers */}
            {routes.map(route => (
              <AdvancedMarker key={`base-${route.teamId}`}
                position={{ lat: route.startLat, lng: route.startLng }}>
                <TeamBaseEl
                  initials={route.cleanerNames.map(n => n[0]).join('')}
                  color={route.color}
                />
              </AdvancedMarker>
            ))}

            {/* Stop markers */}
            {routes.map(route =>
              route.stops.map(stop => (
                <AdvancedMarker
                  key={stop.job.id}
                  position={{ lat: stop.job.lat, lng: stop.job.lng }}
                  onClick={() => setSelectedStopKey(stop.job.id)}
                >
                  <StopMarkerEl seq={stop.sequence} color={route.color} status={stop.status} />
                </AdvancedMarker>
              ))
            )}

            {/* InfoWindow for selected stop */}
            {selectedStop && (
              <InfoWindow
                position={{ lat: selectedStop.stop.job.lat, lng: selectedStop.stop.job.lng }}
                onCloseClick={() => setSelectedStopKey(null)}
              >
                <div style={{ minWidth: 165, fontFamily: 'system-ui', padding: 4 }}>
                  <b style={{ fontSize: 13 }}>Stop {selectedStop.stop.sequence} · {selectedStop.route.cleanerNames.join(' + ')}</b>
                  <p style={{ fontSize: 12, marginTop: 3 }}>{selectedStop.stop.job.address.split(',')[0]}</p>
                  <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {selectedStop.stop.startTime} · {selectedStop.stop.job.estimatedDuration}min
                  </p>
                  <p style={{ fontSize: 11, marginTop: 2, color: CONGESTION_COLOR[selectedStop.stop.drive.traffic] ?? '#888' }}>
                    Drive: {selectedStop.stop.drive.minutes}min · {selectedStop.stop.drive.traffic}
                  </p>
                </div>
              </InfoWindow>
            )}

            {/* Live cleaner GPS dots */}
            {livePositions
              .filter(c => (c.status === 'en-route' || c.status === 'cleaning') && c.currentLat !== 0 && c.currentLng !== 0)
              .map(c => (
                <AdvancedMarker key={`live-${c.id}`}
                  position={{ lat: c.currentLat, lng: c.currentLng }}>
                  <CleanerDotEl initials={c.initials} color={c.color} status={c.status} />
                </AdvancedMarker>
              ))
            }

            {/* This-device GPS dot */}
            {gpsTracking && gpsPos && (
              <AdvancedMarker position={{ lat: gpsPos.lat, lng: gpsPos.lng }}>
                <GpsDotEl />
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>

        {/* Map controls — bottom right */}
        <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
          {loadingRoutes && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-card border border-ink-200 text-[12px] text-ink-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Routing…
            </div>
          )}
          {!loadingRoutes && (
            <button onClick={forceRecompute}
              className="px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer rounded-xl border border-ink-200 bg-card text-ink-400 hover:text-ink-700 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-colors"
              title={routeSource ? `Routes from ${routeSource}` : 'Refresh routes'}>
              ↺ Routes
            </button>
          )}

          <div className="flex overflow-hidden rounded-xl border border-ink-200 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            {(['Map', 'Satellite'] as const).map((label, i) => {
              const active = (label === 'Satellite') === satellite
              return (
                <button key={label} onClick={() => setSatellite(label === 'Satellite')}
                  className={cn('px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer transition-colors',
                    i > 0 && 'border-l border-ink-200',
                    active ? 'bg-violet-500 text-white' : 'bg-card text-ink-400 hover:text-ink-700')}>
                  {label}
                </button>
              )
            })}
          </div>

          <button onClick={() => setShowTraffic(v => !v)}
            className={cn('px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer rounded-xl border shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-colors',
              showTraffic ? 'bg-orange-500 text-white border-ink-200' : 'bg-card text-ink-400 border-ink-200 hover:text-ink-700')}>
            Traffic
          </button>

          <button onClick={() => gpsPos && setFlyTarget({ lat: gpsPos.lat, lng: gpsPos.lng })}
            disabled={!gpsPos}
            className={cn('h-9 w-9 rounded-[10px] border border-ink-200 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-colors',
              gpsPos ? 'bg-violet-500 text-white cursor-pointer' : 'bg-card text-ink-300 cursor-not-allowed')}>
            <Crosshair className="h-4 w-4" />
          </button>
        </div>

        {/* GPS error toast */}
        {gpsError && (
          <div className="absolute top-4 left-1/2 z-[1001] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-card border border-rose-500 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="text-[12px] text-ink-700">{gpsError}</span>
              <button onClick={() => setGpsError(null)}><X className="h-3.5 w-3.5 text-ink-400" /></button>
            </div>
          </div>
        )}

        {/* GPS active bar */}
        {gpsTracking && gpsPos && (
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-card border border-violet-200 shadow-lg">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
              <span className="text-[12px] font-semibold text-violet-400">
                {trackedAs ? `${cleaners.find(c => c.id === trackedAs)?.name.split(' ')[0]} — Live` : 'GPS Active'}
              </span>
              <span className="text-[11px] text-ink-400">±{Math.round(gpsPos.accuracy)}m</span>
              <button onClick={stopGPS}
                className="ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-rose-500/10 border border-rose-500 text-rose-500 cursor-pointer">
                <WifiOff className="h-2.5 w-2.5" /> Stop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
