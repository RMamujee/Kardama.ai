'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import type { Cleaner, CleanerStatus, Customer, Job } from '@/types'
import { buildOptimizedRoutes, TeamRoute, RouteStop, RealLegOverrides } from '@/lib/routing-engine'
import { RealRoute, CONGESTION_COLOR } from '@/lib/google-routing'
import { RoutingPanel } from './RoutingPanel'
import { Crosshair, WifiOff, AlertTriangle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const OVERRIDES_KEY = 'kardama:dispatch:overrides'

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi',            stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
]

function todayStr() { return new Date().toISOString().split('T')[0] }
function loadOverrides(): Record<string, RouteStop['status']> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as { date?: string; overrides?: Record<string, RouteStop['status']> }
    if (p?.date !== todayStr()) return {}
    return p.overrides ?? {}
  } catch { return {} }
}
function saveOverrides(o: Record<string, RouteStop['status']>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify({ date: todayStr(), overrides: o })) } catch {}
}

// ─── SVG icon helpers (no Map ID required) ────────────────────────────────────

function svgIcon(svg: string, size: number): google.maps.Icon {
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  }
}

function stopIcon(seq: number, color: string, status: RouteStop['status']): google.maps.Icon {
  const dim = status === 'cancelled', done = status === 'complete'
  const bg = dim ? '#9ca3af' : done ? '#6b7280' : color
  const label = done ? '✓' : dim ? '×' : String(seq)
  const op = dim ? '0.45' : '1'
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <circle cx="14" cy="14" r="12.5" fill="${bg}" stroke="white" stroke-width="2.5" opacity="${op}"/>
      <text x="14" y="18.5" text-anchor="middle" fill="white" font-size="12" font-weight="800" font-family="-apple-system,sans-serif" opacity="${op}">${label}</text>
    </svg>`, 28)
}

function baseIcon(initials: string, color: string): google.maps.Icon {
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34">
      <rect x="1" y="1" width="32" height="32" rx="8" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="17" y="21" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="-apple-system,sans-serif">${initials}</text>
    </svg>`, 34)
}

function cleanerIcon(initials: string, color: string, status: CleanerStatus): google.maps.Icon {
  const ring = status === 'en-route' ? '#f59e0b' : '#10b981'
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">
      <circle cx="19" cy="19" r="18" fill="${ring}" opacity="0.2"/>
      <circle cx="19" cy="19" r="16" fill="${color}" stroke="${ring}" stroke-width="3"/>
      <text x="19" y="23" text-anchor="middle" fill="white" font-size="11" font-weight="700" font-family="-apple-system,sans-serif">${initials}</text>
      <circle cx="31" cy="31" r="5" fill="${ring}" stroke="white" stroke-width="2"/>
    </svg>`, 38)
}

function gpsDotIcon(): google.maps.Icon {
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <circle cx="9" cy="9" r="8" fill="#8B85F2" stroke="white" stroke-width="3"/>
    </svg>`, 18)
}

// ─── Map layer components (must live inside <Map>) ────────────────────────────

function RoutePolylines({ routes, realRoutes, selectedTeamId }: {
  routes: TeamRoute[]
  realRoutes: Record<string, RealRoute | null>
  selectedTeamId: string | null
}) {
  const map = useMap()
  const polysRef = useRef<google.maps.Polyline[]>([])

  useEffect(() => {
    if (!map) return
    polysRef.current.forEach(p => p.setMap(null))
    polysRef.current = []

    for (const route of routes) {
      const isSelected  = selectedTeamId === route.teamId
      const highlighted = !selectedTeamId || isSelected
      const real = realRoutes[route.teamId]

      if (real && real.segments.length > 0) {
        // ── Real Google road geometry ──────────────────────────────────────────
        // Draw a slightly wider white "casing" underneath for contrast on dark maps
        const allPositions = real.segments.flatMap(s => s.positions.map(([lat, lng]) => ({ lat, lng })))
        polysRef.current.push(new google.maps.Polyline({
          path: allPositions,
          strokeColor: '#ffffff',
          strokeOpacity: highlighted ? 0.5 : 0.08,
          strokeWeight: isSelected ? 10 : 8,
          zIndex: highlighted ? 1 : 0,
          map,
        }))

        // Solid coloured line per segment — congestion colour coding
        for (const seg of real.segments) {
          const color = CONGESTION_COLOR[seg.congestion] ?? route.color
          polysRef.current.push(new google.maps.Polyline({
            path: seg.positions.map(([lat, lng]) => ({ lat, lng })),
            strokeColor: color,
            strokeOpacity: highlighted ? (isSelected ? 0.92 : 0.75) : 0.12,
            strokeWeight: isSelected ? 7 : highlighted ? 5 : 3,
            zIndex: highlighted ? 3 : 1,
            map,
          }))
        }
      } else {
        // ── Haversine straight-line fallback (loading estimate) ───────────────
        // White casing for contrast
        polysRef.current.push(new google.maps.Polyline({
          path: route.polyline.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: '#ffffff',
          strokeOpacity: highlighted ? 0.6 : 0.08,
          strokeWeight: isSelected ? 8 : 6,
          zIndex: 0,
          map,
        }))
        // Coloured dashed line
        polysRef.current.push(new google.maps.Polyline({
          path: route.polyline.map(([lat, lng]) => ({ lat, lng })),
          strokeOpacity: 0,
          icons: [{
            icon: { path: 'M 0,-1 0,1', strokeColor: route.color, strokeOpacity: highlighted ? (isSelected ? 0.85 : 0.6) : 0.12, scale: isSelected ? 4 : 3 },
            offset: '0', repeat: '16px',
          }],
          zIndex: 1,
          map,
        }))
      }
    }

    return () => { polysRef.current.forEach(p => p.setMap(null)) }
  }, [map, routes, realRoutes, selectedTeamId])

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

type LivePos = { id: string; initials: string; color: string; name: string; currentLat: number; currentLng: number; status: CleanerStatus; currentJobId: string | null }
type GpsPos = { lat: number; lng: number; accuracy: number; speed: number | null }

function FlyToTeam({ routes, teamId }: { routes: TeamRoute[]; teamId: string | null }) {
  const map = useMap()
  const prevId = useRef<string | null>(null)
  useEffect(() => {
    if (!map || !teamId || teamId === prevId.current) return
    const route = routes.find(r => r.teamId === teamId)
    if (!route) return
    const b = new google.maps.LatLngBounds()
    b.extend({ lat: route.startLat, lng: route.startLng })
    route.stops.forEach(s => b.extend({ lat: s.job.lat, lng: s.job.lng }))
    if (!b.isEmpty()) map.fitBounds(b, 80)
    prevId.current = teamId
  }, [map, teamId, routes])
  return null
}

function MarkersLayer({ routes, livePositions, gpsTracking, gpsPos, selectedTeamId }: {
  routes: TeamRoute[]
  livePositions: LivePos[]
  gpsTracking: boolean
  gpsPos: GpsPos | null
  selectedTeamId: string | null
}) {
  const map = useMap()
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoRef    = useRef<google.maps.InfoWindow | null>(null)

  useEffect(() => {
    if (!map) return
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    infoRef.current ??= new google.maps.InfoWindow()

    for (const route of routes) {
      const highlighted = !selectedTeamId || route.teamId === selectedTeamId
      const markerOpacity = highlighted ? 1.0 : 0.2

      // Team start (skip if position is unset / (0,0))
      if (route.startLat !== 0 || route.startLng !== 0) {
        const base = new google.maps.Marker({
          position: { lat: route.startLat, lng: route.startLng },
          map, icon: baseIcon(route.cleanerNames.map(n => n[0]).join(''), route.color),
          title: route.cleanerNames.join(' & '),
          opacity: markerOpacity,
        })
        markersRef.current.push(base)
      }

      // Stops (skip any job with un-geocoded coordinates)
      for (const stop of route.stops) {
        if (stop.job.lat === 0 && stop.job.lng === 0) continue
        const m = new google.maps.Marker({
          position: { lat: stop.job.lat, lng: stop.job.lng },
          map, icon: stopIcon(stop.sequence, route.color, stop.status),
          title: stop.job.address,
          opacity: markerOpacity,
        })
        m.addListener('click', () => {
          const congColor = CONGESTION_COLOR[stop.drive.traffic] ?? '#888'
          infoRef.current!.setContent(
            `<div style="min-width:165px;font-family:system-ui;padding:4px">
              <b style="font-size:13px">Stop ${stop.sequence} · ${route.cleanerNames.join(' + ')}</b>
              <p style="font-size:12px;margin:3px 0 0">${stop.job.address.split(',')[0]}</p>
              <p style="font-size:11px;color:#888;margin:2px 0 0">${stop.startTime} · ${stop.job.estimatedDuration}min</p>
              <p style="font-size:11px;margin:2px 0 0;color:${congColor}">${stop.drive.minutes}min drive · ${stop.drive.traffic}</p>
            </div>`
          )
          infoRef.current!.open({ map, anchor: m })
        })
        markersRef.current.push(m)
      }
    }

    // Live cleaner dots
    for (const c of livePositions) {
      if ((c.status === 'en-route' || c.status === 'cleaning') && c.currentLat !== 0) {
        markersRef.current.push(new google.maps.Marker({
          position: { lat: c.currentLat, lng: c.currentLng },
          map, icon: cleanerIcon(c.initials, c.color, c.status), title: c.name,
        }))
      }
    }

    // GPS dot
    if (gpsTracking && gpsPos) {
      markersRef.current.push(new google.maps.Marker({
        position: { lat: gpsPos.lat, lng: gpsPos.lng },
        map, icon: gpsDotIcon(), title: 'My Location',
      }))
    }

    return () => { markersRef.current.forEach(m => m.setMap(null)); infoRef.current?.close() }
  }, [map, routes, livePositions, gpsTracking, gpsPos, selectedTeamId])

  return null
}

function validPos(lat: number, lng: number) { return lat !== 0 || lng !== 0 }

function MapFitBounds({ routes, fitKey }: { routes: TeamRoute[]; fitKey: string }) {
  const map = useMap()
  const fitted = useRef<string | null>(null)
  useEffect(() => {
    if (!map || routes.length === 0 || fitted.current === fitKey) return
    const b = new google.maps.LatLngBounds()
    routes.forEach(r => {
      if (validPos(r.startLat, r.startLng)) b.extend({ lat: r.startLat, lng: r.startLng })
      r.stops.forEach(s => { if (validPos(s.job.lat, s.job.lng)) b.extend({ lat: s.job.lat, lng: s.job.lng }) })
    })
    if (!b.isEmpty()) { map.fitBounds(b, 60); fitted.current = fitKey }
  }, [map, routes, fitKey])
  return null
}

function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => { if (map && target) { map.panTo(target); map.setZoom(15) } }, [map, target])
  return null
}

function GpsTrail({ trail }: { trail: [number, number][] }) {
  const map = useMap()
  const ref = useRef<google.maps.Polyline | null>(null)
  useEffect(() => {
    if (!map) return
    ref.current = new google.maps.Polyline({
      strokeColor: '#8B85F2', strokeWeight: 3, strokeOpacity: 0,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '15px' }], map,
    })
    return () => { ref.current?.setMap(null); ref.current = null }
  }, [map])
  useEffect(() => { ref.current?.setPath(trail.map(([lat, lng]) => ({ lat, lng }))) }, [trail])
  return null
}

function customerPinIcon(): google.maps.Icon {
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28">
      <path d="M11 0C5 0 0 5 0 11c0 8 11 17 11 17S22 19 22 11C22 5 17 0 11 0z" fill="#2DD4BF" stroke="white" stroke-width="2"/>
      <circle cx="11" cy="11" r="4" fill="white" opacity="0.9"/>
    </svg>`, 22)
}

function CustomersLayer({ customers, visible }: { customers: Customer[]; visible: boolean }) {
  const map = useMap()
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoRef    = useRef<google.maps.InfoWindow | null>(null)

  useEffect(() => {
    if (!map) return
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    infoRef.current?.close()
    if (!visible) return

    infoRef.current ??= new google.maps.InfoWindow()
    for (const c of customers) {
      if (!c.lat || !c.lng) continue
      const m = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map,
        icon: customerPinIcon(),
        title: c.name,
      })
      m.addListener('click', () => {
        infoRef.current!.setContent(
          `<div style="min-width:150px;font-family:system-ui;padding:4px">
            <b style="font-size:13px">${c.name}</b>
            <p style="font-size:11px;color:#888;margin:3px 0 0">${c.address.split(',')[0]}</p>
            <p style="font-size:11px;color:#888;margin:2px 0 0">${c.city}</p>
          </div>`
        )
        infoRef.current!.open({ map, anchor: m })
      })
      markersRef.current.push(m)
    }

    return () => { markersRef.current.forEach(m => m.setMap(null)); infoRef.current?.close() }
  }, [map, customers, visible])

  return null
}

// ─── Browser-side Directions loader ──────────────────────────────────────────
// Runs inside <Map> so google.maps JS API is guaranteed loaded and the
// browser sends the page URL as the HTTP referrer — required when the API key
// has HTTP referrer restrictions (server-side calls have no referrer).

function DirectionsLoader({ routes, date, onLoaded, onStatus }: {
  routes: TeamRoute[]
  date: string
  onLoaded: (data: Record<string, RealRoute>) => void
  onStatus: (teamId: string, status: string) => void
}) {
  const onLoadedRef = useRef(onLoaded)
  const onStatusRef = useRef(onStatus)
  useEffect(() => { onLoadedRef.current = onLoaded; onStatusRef.current = onStatus })

  const routeKey = `${date}:${routes.map(r =>
    `${r.teamId}:${r.stops.filter(s => s.status !== 'cancelled').length}:${r.startLat.toFixed(4)},${r.startLng.toFixed(4)}`
  ).join(',')}`
  const lastKeyRef = useRef('')

  useEffect(() => {
    if (!routeKey || routeKey === lastKeyRef.current) return
    lastKeyRef.current = routeKey

    const service = new google.maps.DirectionsService()
    const results: Record<string, RealRoute> = {}

    const promises = routes.map(route => {
      const active = route.stops.filter(s => s.status !== 'cancelled')
      if (active.length === 0) { onStatusRef.current(route.teamId, 'NO_STOPS'); return Promise.resolve() }

      const dest = active[active.length - 1].job
      // If origin equals destination (no home/GPS set, fallback = first job), skip — would
      // return a trivial zero-distance route with no meaningful geometry.
      const samePoint = Math.abs(route.startLat - dest.lat) < 0.0001 && Math.abs(route.startLng - dest.lng) < 0.0001
      if (samePoint && active.length === 1) {
        console.warn(`[DirectionsLoader] ${route.teamId}: origin=destination, skipping (cleaner has no home/GPS set)`)
        onStatusRef.current(route.teamId, 'SAME_ORIGIN_DEST')
        return Promise.resolve()
      }

      return new Promise<void>(resolve => {
        service.route({
          origin: { lat: route.startLat, lng: route.startLng },
          destination: { lat: dest.lat, lng: dest.lng },
          waypoints: active.slice(0, -1).map(s => ({
            location: new google.maps.LatLng(s.job.lat, s.job.lng),
            stopover: true,
          })),
          travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
          onStatusRef.current(route.teamId, status)
          if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]) {
            const gRoute = result.routes[0]
            // overview_path is guaranteed non-empty on OK; step.path can be empty
            const overviewPositions = (gRoute.overview_path ?? []).map(
              (p: google.maps.LatLng) => [p.lat(), p.lng()] as [number, number]
            )
            // Build one segment per leg — fall back to slicing overview_path if steps have no geometry
            const legFractions = gRoute.legs.map(leg => {
              const pts = leg.steps.flatMap(step =>
                (step.path ?? []).map((p: google.maps.LatLng) => [p.lat(), p.lng()] as [number, number])
              )
              return pts.length > 1 ? pts : null
            })
            const allStepsHavePaths = legFractions.every(f => f !== null)
            const segments = allStepsHavePaths
              ? legFractions.map(pts => ({ positions: pts!, congestion: 'clear' as const }))
              : [{ positions: overviewPositions, congestion: 'clear' as const }]
            const legs = gRoute.legs.map(leg => ({
              durationMin: ((leg.duration_in_traffic ?? leg.duration)?.value ?? 0) / 60,
              distanceKm: (leg.distance?.value ?? 0) / 1000,
              traffic: 'clear' as const,
            }))
            console.log(`[DirectionsLoader] ${route.teamId}: OK — ${segments.length} seg(s), ${segments.reduce((a, s) => a + s.positions.length, 0)} pts`)
            results[route.teamId] = { teamId: route.teamId, segments, legs }
          } else {
            console.error(`[DirectionsLoader] ${route.teamId}: status=${status}`, { startLat: route.startLat, startLng: route.startLng, dest: { lat: dest.lat, lng: dest.lng } })
          }
          resolve()
        })
      })
    })

    Promise.all(promises).then(() => {
      if (Object.keys(results).length > 0) onLoadedRef.current(results)
    })
  }, [routeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LiveMapViewProps { cleaners: Cleaner[]; allJobs: Job[]; customers: Customer[] }

export function LiveMapView({ cleaners, allJobs, customers }: LiveMapViewProps) {
  const [mounted, setMounted]             = useState(false)
  const [satellite, setSatellite]         = useState(false)
  const [showTraffic, setShowTraffic]     = useState(true)
  const [showCustomers, setShowCustomers] = useState(false)
  const [overrides, setOverrides]         = useState<Record<string, RouteStop['status']>>({})
  const [unavailableTeamIds, setUnavailableTeamIds] = useState<Set<string>>(new Set())
  const [realRoutes, setRealRoutes]       = useState<Record<string, RealRoute | null>>({})
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [routeSource, setRouteSource]     = useState<'cache' | 'computed' | null>(null)
  const [diagData, setDiagData]           = useState<Record<string, unknown> | null>(null)
  const [diagLoading, setDiagLoading]     = useState(false)
  const [flyTarget, setFlyTarget]         = useState<{ lat: number; lng: number } | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate]   = useState(() => todayStr())
  const [gpsPos, setGpsPos]               = useState<GpsPos | null>(null)
  const [gpsTrail, setGpsTrail]           = useState<[number, number][]>([])
  const [gpsTracking, setGpsTracking]     = useState(false)
  const [trackedAs, setTrackedAs]         = useState<string | null>(null)
  const [gpsError, setGpsError]           = useState<string | null>(null)
  const watchRef = useRef<number | null>(null)
  const selectedDateRef = useRef(selectedDate)
  useEffect(() => { selectedDateRef.current = selectedDate }, [selectedDate])

  const isToday = selectedDate === todayStr()

  // 7 days back + today + 7 days forward so past-scheduled jobs are reachable
  const dateTabs = useMemo(() => Array.from({ length: 15 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + (i - 7))
    const iso = d.toISOString().split('T')[0]
    const label = i === 7 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
    return { iso, label }
  }), [])

  const datesWithJobs = useMemo(() => new Set(allJobs.map(j => j.scheduledDate)), [allJobs])

  const [livePositions, setLivePositions] = useState<LivePos[]>(() =>
    cleaners.map(c => ({ id: c.id, initials: c.initials, color: c.color, name: c.name, currentLat: c.currentLat, currentLng: c.currentLng, status: c.status, currentJobId: c.currentJobId }))
  )

  useEffect(() => { setOverrides(loadOverrides()); setMounted(true) }, [])

  useEffect(() => {
    setLivePositions(cleaners.map(c => ({ id: c.id, initials: c.initials, color: c.color, name: c.name, currentLat: c.currentLat, currentLng: c.currentLng, status: c.status, currentJobId: c.currentJobId })))
  }, [cleaners])

  useEffect(() => {
    if (!mounted) return
    const supabase = getSupabaseBrowserClient()
    const cleanerCh = supabase.channel('cleaner-positions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cleaners' }, payload => {
        const r = payload.new as { id: string; current_lat: number; current_lng: number; status: CleanerStatus; current_job_id: string | null }
        setLivePositions(prev => prev.map(c => c.id === r.id ? { ...c, currentLat: Number(r.current_lat), currentLng: Number(r.current_lng), status: r.status, currentJobId: r.current_job_id } : c))
      }).subscribe()
    const routeCh = supabase.channel('daily-routes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_routes' }, payload => {
        const r = payload.new as { team_id: string; route_date: string; segments: RealRoute['segments']; legs: RealRoute['legs'] }
        if (r?.team_id && r.route_date === selectedDateRef.current)
          setRealRoutes(prev => ({ ...prev, [r.team_id]: { teamId: r.team_id, segments: r.segments, legs: r.legs } }))
      }).subscribe()
    return () => { supabase.removeChannel(cleanerCh); supabase.removeChannel(routeCh) }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    setLoadingRoutes(true)
    setRealRoutes({})
    fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { routes: Array<{ teamId: string; segments: RealRoute['segments']; legs: RealRoute['legs'] }>; source: 'cache' | 'computed' } | null) => {
        if (!data?.routes) return
        setRouteSource(data.source)
        // Only apply server segments if they have real Google geometry — skip
        // empty-segment results so browser-side DirectionsLoader data is not overwritten.
        const withSegments: Record<string, RealRoute> = {}
        data.routes.forEach(r => {
          if (r.segments?.length > 0)
            withSegments[r.teamId] = { teamId: r.teamId, segments: r.segments, legs: r.legs }
        })
        if (Object.keys(withSegments).length > 0) setRealRoutes(prev => ({ ...prev, ...withSegments }))
      })
      .finally(() => setLoadingRoutes(false))
  }, [mounted, selectedDate])

  const [directionsStatuses, setDirectionsStatuses] = useState<Record<string, string>>({})
  const handleDirectionsLoaded = useCallback((data: Record<string, RealRoute>) => {
    setRealRoutes(prev => ({ ...prev, ...data }))
  }, [])
  const handleDirectionsStatus = useCallback((teamId: string, status: string) => {
    setDirectionsStatuses(prev => ({ ...prev, [teamId]: status }))
  }, [])

  const hasGoogleData = useMemo(
    () => Object.values(realRoutes).some(r => r && r.segments.length > 0),
    [realRoutes]
  )

  function handleDateChange(date: string) {
    setSelectedDate(date)
    setSelectedTeamId(null)
    if (date !== todayStr() && gpsTracking) stopGPS()
  }

  const dateJobs = useMemo(
    () => allJobs.filter(j => j.scheduledDate === selectedDate),
    [allJobs, selectedDate]
  )
  const todayJobs = useMemo(() => dateJobs.map(j => overrides[j.id] === 'cancelled' ? { ...j, status: 'cancelled' as const } : j), [dateJobs, overrides])
  const availableCleaners = useMemo(() => cleaners.filter(c => !unavailableTeamIds.has(c.teamId)), [cleaners, unavailableTeamIds])
  const availableTeamIdList = useMemo(() => [...new Set(availableCleaners.map(c => c.teamId))], [availableCleaners])
  const redistributedJobs = useMemo(() => {
    if (unavailableTeamIds.size === 0) return todayJobs
    let rrIdx = 0
    return todayJobs.map(job => {
      if (job.status === 'cancelled') return job
      const lead = cleaners.find(c => c.id === job.cleanerIds[0])
      if (!lead || !unavailableTeamIds.has(lead.teamId)) return job
      const newTeamId = availableTeamIdList[rrIdx++ % availableTeamIdList.length]
      const newLead = availableCleaners.find(c => c.teamId === newTeamId)
      return newLead ? { ...job, cleanerIds: [newLead.id, ...job.cleanerIds.slice(1)] } : job
    })
  }, [todayJobs, cleaners, unavailableTeamIds, availableTeamIdList, availableCleaners])

  const haversineRoutes = useMemo(() => buildOptimizedRoutes(redistributedJobs, availableCleaners), [redistributedJobs, availableCleaners])
  const routes: TeamRoute[] = useMemo(() => {
    const overridesByTeam: RealLegOverrides = {}
    for (const r of haversineRoutes) {
      const real = realRoutes[r.teamId]
      if (real && real.legs.length === r.stops.length)
        overridesByTeam[r.teamId] = real.legs.map(l => ({ durationMin: l.durationMin, distanceKm: l.distanceKm, traffic: l.traffic as 'clear' | 'moderate' | 'heavy' | undefined }))
    }
    return Object.keys(overridesByTeam).length > 0 ? buildOptimizedRoutes(redistributedJobs, availableCleaners, overridesByTeam) : haversineRoutes
  }, [haversineRoutes, redistributedJobs, availableCleaners, realRoutes])

  function setStopStatus(jobId: string, status: RouteStop['status'] | null) {
    setOverrides(prev => { const n = { ...prev }; status === null ? delete n[jobId] : (n[jobId] = status); saveOverrides(n); return n })
  }

  function startGPS(cleanerId: string | null = null) {
    if (!navigator.geolocation) { setGpsError('GPS not supported'); return }
    setGpsError(null); setGpsTrail([]); setTrackedAs(cleanerId); setGpsTracking(true)
    watchRef.current = navigator.geolocation.watchPosition(
      pos => { const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords; setGpsPos({ lat, lng, accuracy, speed }); setGpsTrail(p => [...p, [lat, lng]]) },
      err => { setGpsError(['', 'Location denied', 'Position unavailable', 'GPS timed out'][err.code] ?? 'GPS error'); setGpsTracking(false) },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  function stopGPS() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    setGpsTracking(false); setTrackedAs(null); setGpsPos(null); setGpsTrail([])
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full">
      {/* Date selector strip */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-ink-200 bg-rail overflow-x-auto shrink-0">
        {dateTabs.map(tab => {
          const hasJobs = datesWithJobs.has(tab.iso)
          const isSelected = selectedDate === tab.iso
          return (
            <button
              key={tab.iso}
              onClick={() => handleDateChange(tab.iso)}
              className={cn(
                'relative px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors cursor-pointer',
                isSelected
                  ? 'bg-violet-500 text-white'
                  : hasJobs
                    ? 'text-ink-700 hover:bg-hover bg-violet-500/8'
                    : 'text-ink-400 hover:bg-hover hover:text-ink-700'
              )}
            >
              {tab.label}
              {hasJobs && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-violet-400" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-1 min-h-0">
      <RoutingPanel
        routes={routes} cleaners={cleaners}
        unavailableTeamIds={unavailableTeamIds}
        onToggleTeamAvailability={id => setUnavailableTeamIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
        overrides={overrides} onSetStopStatus={setStopStatus}
        gpsTracking={gpsTracking} trackedCleaner={trackedAs}
        onStartGPS={startGPS} onStopGPS={stopGPS}
        onFlyTo={(lat, lng) => setFlyTarget({ lat, lng })}
        selectedTeamId={selectedTeamId}
        onFocusTeam={id => setSelectedTeamId(prev => prev === id ? null : id)}
        selectedDate={selectedDate}
        isToday={isToday}
        hasGoogleData={hasGoogleData}
        loadingRoutes={loadingRoutes}
        datesWithJobs={datesWithJobs}
      />

      <div className="relative flex-1 overflow-hidden">
        <APIProvider apiKey={GMAPS_KEY}>
          <Map
            defaultCenter={{ lat: 33.87, lng: -118.26 }}
            defaultZoom={11}
            mapTypeId={satellite ? 'satellite' : 'roadmap'}
            gestureHandling="greedy"
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            styles={satellite ? [] : MAP_STYLES}
            style={{ width: '100%', height: '100%' }}
          >
            <DirectionsLoader routes={haversineRoutes} date={selectedDate} onLoaded={handleDirectionsLoaded} onStatus={handleDirectionsStatus} />
            <RoutePolylines routes={routes} realRoutes={realRoutes} selectedTeamId={selectedTeamId} />
            <TrafficLayer show={showTraffic} />
            <CustomersLayer customers={customers} visible={showCustomers} />
            <MapFitBounds routes={routes} fitKey={selectedDate} />
            <FlyTo target={flyTarget} />
            <FlyToTeam routes={routes} teamId={selectedTeamId} />
            {gpsTrail.length > 1 && <GpsTrail trail={gpsTrail} />}
            <MarkersLayer routes={routes} livePositions={livePositions} gpsTracking={gpsTracking} gpsPos={gpsPos} selectedTeamId={selectedTeamId} />
          </Map>
        </APIProvider>

        {/* Diagnostic overlay */}
        {diagData && (
          <div className="absolute top-4 left-4 z-[1001] w-80 rounded-xl border border-ink-200 bg-card shadow-xl text-[11px] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-ink-200 bg-soft">
              <span className="font-bold text-ink-700 text-[12px]">Route Diagnostic</span>
              <button onClick={() => setDiagData(null)} className="text-ink-400 hover:text-ink-700"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto max-h-96">
              {/* Google status */}
              {(() => {
                const g = diagData.google as Record<string, unknown>
                const ok = g.status === 'OK'
                return (
                  <div className={cn('rounded-lg p-2', ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20')}>
                    <p className={cn('font-bold', ok ? 'text-emerald-500' : 'text-rose-500')}>
                      Google Directions: {String(g.status)}
                    </p>
                    {g.error ? <p className="text-rose-400 mt-0.5">{String(g.error)}</p> : null}
                    <p className="text-ink-400 mt-0.5">
                      Server key: {g.serverKeyPresent ? '✓' : '✗'} · Public key: {g.publicKeyPresent ? '✓' : '✗'}
                    </p>
                  </div>
                )
              })()}
              {/* Browser-side DirectionsService status */}
              {Object.keys(directionsStatuses).length > 0 && (
                <div className={cn('rounded-lg p-2 border', Object.values(directionsStatuses).every(s => s === 'OK') ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20')}>
                  <p className="font-bold text-ink-700">Browser DirectionsService</p>
                  {Object.entries(directionsStatuses).map(([tid, st]) => (
                    <p key={tid} className={st === 'OK' ? 'text-emerald-500' : st === 'SAME_ORIGIN_DEST' ? 'text-amber-500' : 'text-rose-500'}>
                      {tid}: {st}
                    </p>
                  ))}
                  {Object.values(directionsStatuses).some(s => s === 'SAME_ORIGIN_DEST') && (
                    <p className="text-amber-400 mt-0.5">No home area set — add one on the Team page</p>
                  )}
                </div>
              )}
              {/* DB state */}
              {(() => {
                const db = diagData.db as Record<string, unknown>
                const byDate = db.jobsByDate as Record<string, number>
                return (
                  <div className="rounded-lg p-2 bg-soft border border-ink-200">
                    <p className="font-bold text-ink-700">Database</p>
                    <p className="text-ink-500">{String(db.cleanerCount)} cleaners · {String(db.jobsForDate)} jobs on {String(diagData.date)}</p>
                    {Object.keys(byDate).length > 0 && (
                      <div className="mt-1">
                        <p className="text-ink-400 mb-0.5">All job dates:</p>
                        {Object.entries(byDate).sort().map(([d, n]) => (
                          <p key={d} className={cn('text-ink-500', d === diagData.date && 'font-bold text-violet-400')}>{d}: {n} job{n > 1 ? 's' : ''}</p>
                        ))}
                      </div>
                    )}
                    {(db.cleanerCount as number) > 0 && (
                      <div className="mt-1">
                        <p className="text-ink-400 mb-0.5">Cleaners:</p>
                        {(db.cleaners as Array<{ id: string; name: string; teamId: string | null }>).map(c => (
                          <p key={c.id} className="text-ink-500">{c.name} — teamId: {c.teamId || '(none)'}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
              {/* Routing */}
              {(() => {
                const r = diagData.routing as Record<string, unknown>
                return (
                  <div className={cn('rounded-lg p-2 border', (r.routeCount as number) > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20')}>
                    <p className="font-bold text-ink-700">Routing engine</p>
                    <p className={(r.routeCount as number) > 0 ? 'text-emerald-500' : 'text-amber-500'}>
                      {String(r.routeCount)} route{(r.routeCount as number) !== 1 ? 's' : ''} built for this date
                    </p>
                    {(r.routes as Array<{ teamId: string; stopCount: number }>).map(rt => (
                      <p key={rt.teamId} className="text-ink-500">{rt.teamId}: {rt.stopCount} stops</p>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
          {loadingRoutes
            ? <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-card border border-ink-200 text-[12px] text-ink-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Routing…</div>
            : <button onClick={() => {
                setLoadingRoutes(true)
                fetch('/api/routes/compute', {
                  method: 'POST',
                  headers: { 'x-force': '1', 'Content-Type': 'application/json' },
                  body: JSON.stringify({ date: selectedDate }),
                })
                  .then(r => r.ok ? r.json() : null)
                  .then((data: { routes: Array<{ teamId: string; segments: RealRoute['segments']; legs: RealRoute['legs'] }> } | null) => {
                    if (!data?.routes) return
                    const map: Record<string, RealRoute | null> = {}
                    data.routes.forEach(r => { map[r.teamId] = { teamId: r.teamId, segments: r.segments, legs: r.legs } })
                    setRealRoutes(map)
                  })
                  .finally(() => setLoadingRoutes(false))
              }}
              className="px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer rounded-xl border border-ink-200 bg-card text-ink-400 hover:text-ink-700 shadow-md transition-colors"
              title={routeSource ? `Routes from ${routeSource}` : 'Refresh routes'}>
              ↺ Routes
            </button>
          }
          <button
            onClick={() => {
              setDiagLoading(true)
              fetch(`/api/admin/route-diag?date=${selectedDate}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d) setDiagData(d) })
                .finally(() => setDiagLoading(false))
            }}
            disabled={diagLoading}
            className="px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer rounded-xl border border-ink-200 bg-card text-ink-400 hover:text-ink-700 shadow-md transition-colors"
            title="Show routing diagnostic">
            {diagLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Diag'}
          </button>
          <div className="flex overflow-hidden rounded-xl border border-ink-200 shadow-md">
            {(['Map', 'Satellite'] as const).map((label, i) => (
              <button key={label} onClick={() => setSatellite(label === 'Satellite')}
                className={cn('px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer transition-colors', i > 0 && 'border-l border-ink-200',
                  (label === 'Satellite') === satellite ? 'bg-violet-500 text-white' : 'bg-card text-ink-400 hover:text-ink-700')}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowTraffic(v => !v)}
            className={cn('px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer rounded-xl border shadow-md transition-colors',
              showTraffic ? 'bg-orange-500 text-white border-ink-200' : 'bg-card text-ink-400 border-ink-200 hover:text-ink-700')}>
            Traffic
          </button>
          <button
            onClick={() => setShowCustomers(v => !v)}
            className={cn('px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer rounded-xl border shadow-md transition-colors flex items-center gap-1.5',
              showCustomers ? 'bg-teal-500 text-white border-teal-500' : 'bg-card text-ink-400 border-ink-200 hover:text-ink-700')}
            title="Toggle customer locations">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 22 28" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M11 0C5 0 0 5 0 11c0 8 11 17 11 17S22 19 22 11C22 5 17 0 11 0z"/>
            </svg>
            Customers
          </button>
          <button onClick={() => gpsPos && setFlyTarget({ lat: gpsPos.lat, lng: gpsPos.lng })} disabled={!gpsPos}
            className={cn('h-9 w-9 rounded-[10px] border border-ink-200 flex items-center justify-center shadow-md transition-colors', gpsPos ? 'bg-violet-500 text-white cursor-pointer' : 'bg-card text-ink-300 cursor-not-allowed')}>
            <Crosshair className="h-4 w-4" />
          </button>
        </div>

        {gpsError && (
          <div className="absolute top-4 left-1/2 z-[1001] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-card border border-rose-500 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="text-[12px] text-ink-700">{gpsError}</span>
              <button onClick={() => setGpsError(null)}><X className="h-3.5 w-3.5 text-ink-400" /></button>
            </div>
          </div>
        )}
        {gpsTracking && gpsPos && (
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-card border border-violet-200 shadow-lg">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
              <span className="text-[12px] font-semibold text-violet-400">
                {trackedAs ? `${cleaners.find(c => c.id === trackedAs)?.name.split(' ')[0]} — Live` : 'GPS Active'}
              </span>
              <span className="text-[11px] text-ink-400">±{Math.round(gpsPos.accuracy)}m</span>
              <button onClick={stopGPS} className="ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-rose-500/10 border border-rose-500 text-rose-500 cursor-pointer">
                <WifiOff className="h-2.5 w-2.5" /> Stop
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
