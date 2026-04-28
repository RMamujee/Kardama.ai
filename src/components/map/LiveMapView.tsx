'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CLEANERS, JOBS } from '@/lib/mock-data'
import {
  buildOptimizedRoutes, TeamRoute, RouteStop, RealLegOverrides,
} from '@/lib/routing-engine'
import { fetchTeamRoute, RealRoute, CONGESTION_COLOR } from '@/lib/mapbox-routing'
import { RoutingPanel } from './RoutingPanel'
import { Crosshair, WifiOff, AlertTriangle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Free tile layers — no API key required
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_SAT  = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ATTR_CARTO = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>'
const ATTR_SAT   = '© Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics'

// localStorage key — overrides are scoped to the day so they reset overnight.
const OVERRIDES_KEY = 'kardama:dispatch:overrides'

function fixLeafletIcons() {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

function stopIcon(seq: number, color: string, status: RouteStop['status']): L.DivIcon {
  const dim   = status === 'cancelled'
  const done  = status === 'complete'
  const bg    = dim ? '#9ca3af' : done ? '#6b7280' : color
  const label = done ? '✓' : dim ? '×' : String(seq)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;background:${bg};
      border:2.5px solid rgba(255,255,255,0.85);
      display:flex;align-items:center;justify-content:center;
      font-weight:800;color:white;font-size:12px;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      font-family:-apple-system,sans-serif;
      opacity:${dim ? 0.45 : 1};
    ">${label}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
  })
}

function teamBaseIcon(initials: string, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:8px;background:${color};
      border:2.5px solid rgba(255,255,255,0.85);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;color:white;font-size:10px;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
      font-family:-apple-system,sans-serif;
    ">${initials}</div>`,
    iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -19],
  })
}

function makeGpsIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="gps-dot" style="width:18px;height:18px;border-radius:50%;background:#8B85F2;border:3px solid white;box-shadow:0 2px 10px rgba(139,133,242,0.6);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -11],
  })
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 }) }, [map, lat, lng])
  return null
}

interface GpsPos { lat: number; lng: number; accuracy: number; speed: number | null }

function todayStr() { return new Date().toISOString().split('T')[0] }

function loadOverrides(): Record<string, RouteStop['status']> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { date?: string; overrides?: Record<string, RouteStop['status']> }
    if (parsed?.date !== todayStr()) return {}
    return parsed.overrides ?? {}
  } catch {
    return {}
  }
}

function saveOverrides(overrides: Record<string, RouteStop['status']>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify({
      date: todayStr(),
      overrides,
    }))
  } catch {
    // quota / private mode — fail silently
  }
}

export function LiveMapView() {
  const [mounted, setMounted]           = useState(false)
  const [satellite, setSatellite]       = useState(false)
  const [showTraffic, setShowTraffic]   = useState(true)
  const [overrides, setOverrides]       = useState<Record<string, RouteStop['status']>>({})
  const [realRoutes, setRealRoutes]     = useState<Record<string, RealRoute | null>>({})
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [gpsPos, setGpsPos]             = useState<GpsPos | null>(null)
  const [gpsTrail, setGpsTrail]         = useState<[number,number][]>([])
  const [gpsTracking, setGpsTracking]   = useState(false)
  const [trackedAs, setTrackedAs]       = useState<string | null>(null)
  const [gpsError, setGpsError]         = useState<string | null>(null)
  const [flyTarget, setFlyTarget]       = useState<{ lat: number; lng: number } | null>(null)
  const watchRef   = useRef<number | null>(null)
  const fetchAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    fixLeafletIcons()
    setOverrides(loadOverrides())
    setMounted(true)
  }, [])

  // Today's jobs with cancellation overrides applied. Memoised so referential
  // equality only changes when overrides change.
  const todayJobs = useMemo(() => {
    const t = todayStr()
    return JOBS
      .filter(j => j.scheduledDate === t)
      .map(j => overrides[j.id] === 'cancelled' ? { ...j, status: 'cancelled' as const } : j)
  }, [overrides])

  // First pass: build routes with haversine estimates so the UI shows
  // something immediately. Then we ask OSRM for real geometry below.
  const haversineRoutes = useMemo(
    () => buildOptimizedRoutes(todayJobs, CLEANERS),
    [todayJobs],
  )

  // Re-build using OSRM real durations once they arrive.
  const routes: TeamRoute[] = useMemo(() => {
    const overridesByTeam: RealLegOverrides = {}
    for (const r of haversineRoutes) {
      const real = realRoutes[r.teamId]
      // OSRM legs are start → stop1, stop1 → stop2, ... so length should equal
      // the number of stops on this route.
      if (real && real.legs.length === r.stops.length) {
        overridesByTeam[r.teamId] = real.legs
      }
    }
    return Object.keys(overridesByTeam).length > 0
      ? buildOptimizedRoutes(todayJobs, CLEANERS, overridesByTeam)
      : haversineRoutes
  }, [haversineRoutes, todayJobs, realRoutes])

  // Fetch real road geometry from OSRM whenever the route shape changes.
  useEffect(() => {
    if (haversineRoutes.length === 0) return
    fetchAbort.current?.abort()
    fetchAbort.current = new AbortController()
    setLoadingRoutes(true)

    Promise.all(
      haversineRoutes.map(route => {
        const waypoints = [
          { lat: route.startLat, lng: route.startLng },
          ...route.stops.filter(s => s.status !== 'cancelled').map(s => ({ lat: s.job.lat, lng: s.job.lng })),
        ]
        return fetchTeamRoute(route.teamId, waypoints, '', fetchAbort.current?.signal)
      })
    ).then(results => {
      const map: Record<string, RealRoute | null> = {}
      results.forEach((r, i) => { map[haversineRoutes[i].teamId] = r })
      setRealRoutes(map)
      setLoadingRoutes(false)
    }).catch(err => {
      if ((err as { name?: string })?.name !== 'AbortError') setLoadingRoutes(false)
    })
  }, [haversineRoutes])

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
    if (!navigator.geolocation) { setGpsError('GPS not supported in this browser'); return }
    setGpsError(null); setGpsTrail([]); setTrackedAs(cleanerId); setGpsTracking(true)
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords
        setGpsPos({ lat, lng, accuracy, speed })
        setGpsTrail(prev => [...prev, [lat, lng]])
      },
      err => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied', 2: 'Position unavailable', 3: 'GPS timed out',
        }
        setGpsError(msgs[err.code] ?? 'GPS error')
        setGpsTracking(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  function stopGPS() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    setGpsTracking(false); setTrackedAs(null); setGpsPos(null); setGpsTrail([])
  }

  if (!mounted) return null

  const tileUrl  = satellite ? TILE_SAT : TILE_DARK
  const tileAttr = satellite ? ATTR_SAT : ATTR_CARTO

  return (
    <div className="flex h-full">
      <RoutingPanel
        routes={routes}
        cleaners={CLEANERS}
        overrides={overrides}
        onSetStopStatus={setStopStatus}
        gpsTracking={gpsTracking}
        trackedCleaner={trackedAs}
        onStartGPS={startGPS}
        onStopGPS={stopGPS}
        onFlyTo={(lat, lng) => setFlyTarget({ lat, lng })}
      />

      <div className="relative flex-1 overflow-hidden">
        <MapContainer center={[33.87, -118.26]} zoom={11}
          style={{ height: '100%', width: '100%' }} zoomControl={false}>

          <TileLayer key={satellite ? 'sat' : 'dark'} url={tileUrl} attribution={tileAttr} maxZoom={19} />
          {showTraffic && (
            <TileLayer
              key="traffic"
              url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_TOMTOM_API_KEY}`}
              attribution='© TomTom'
              maxZoom={19}
              opacity={0.7}
              tileSize={256}
            />
          )}

          {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

          {routes.map(route => {
            const real = realRoutes[route.teamId]
            return (
              <span key={route.teamId}>
                {real
                  ? real.segments.map((seg, i) => (
                      <Polyline key={i} positions={seg.positions}
                        color={route.color} weight={5} opacity={0.85} />
                    ))
                  : <Polyline positions={route.polyline} color={route.color}
                      weight={3.5} opacity={0.5} dashArray="8 6" />
                }

                <Marker position={[route.startLat, route.startLng]}
                  icon={teamBaseIcon(route.cleanerNames.map(n => n[0]).join(''), route.color)}>
                  <Popup>
                    <div style={{ padding: 4 }}>
                      <b>{route.cleanerNames.join(' + ')}</b>
                      <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        Start · {route.stops.length} stops · {route.totalDriveMin} min drive
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {route.stops.map(stop => (
                  <Marker key={stop.job.id}
                    position={[stop.job.lat, stop.job.lng]}
                    icon={stopIcon(stop.sequence, route.color, stop.status)}>
                    <Popup>
                      <div style={{ minWidth: 165, padding: 4 }}>
                        <b style={{ fontSize: 13 }}>Stop {stop.sequence} · {route.cleanerNames.join(' + ')}</b>
                        <p style={{ fontSize: 12, marginTop: 3 }}>{stop.job.address.split(',')[0]}</p>
                        <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                          {stop.startTime} · {stop.job.estimatedDuration} min
                        </p>
                        <p style={{ fontSize: 11, color: CONGESTION_COLOR[stop.drive.traffic] ?? '#aaa', marginTop: 2 }}>
                          Drive: {stop.drive.minutes} min · {stop.drive.traffic}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </span>
            )
          })}

          {gpsTracking && gpsPos && (
            <Circle center={[gpsPos.lat, gpsPos.lng]} radius={Math.max(gpsPos.accuracy, 10)}
              pathOptions={{ color: '#8B85F2', fillColor: '#8B85F2', fillOpacity: 0.07, weight: 1.5 }} />
          )}
          {gpsTracking && gpsTrail.length > 1 && (
            <Polyline positions={gpsTrail} color="#8B85F2" weight={3} opacity={0.5} dashArray="5 5" />
          )}
          {gpsTracking && gpsPos && (
            <Marker position={[gpsPos.lat, gpsPos.lng]} icon={makeGpsIcon()}>
              <Popup>
                <div style={{ padding: 4 }}>
                  <b>{trackedAs ? `Tracking ${CLEANERS.find(c => c.id === trackedAs)?.name.split(' ')[0]}` : 'Your Location'}</b>
                  <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>±{Math.round(gpsPos.accuracy)}m</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Map controls — bottom right */}
        <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
          {loadingRoutes && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-card border border-ink-200 text-[12px] text-ink-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Routing…
            </div>
          )}

          {/* Map / Satellite toggle */}
          <div className="flex overflow-hidden rounded-xl border border-ink-200 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            {(['Map', 'Satellite'] as const).map((label, i) => {
              const active = (label === 'Satellite') === satellite
              return (
                <button
                  key={label}
                  onClick={() => setSatellite(label === 'Satellite')}
                  className={cn(
                    'px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer transition-colors',
                    i > 0 && 'border-l border-ink-200',
                    active ? 'bg-violet-500 text-white' : 'bg-card text-ink-400 hover:text-ink-700'
                  )}
                >{label}</button>
              )
            })}
          </div>

          {/* Traffic toggle */}
          <button
            onClick={() => setShowTraffic(v => !v)}
            className={cn(
              'px-[14px] py-[7px] text-[12px] font-semibold cursor-pointer rounded-xl border border-ink-200 shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors',
              showTraffic ? 'bg-orange-500 text-white' : 'bg-card text-ink-400 hover:text-ink-700'
            )}
          >Traffic</button>

          {/* Centre on GPS */}
          <button
            onClick={() => gpsPos && setFlyTarget({ lat: gpsPos.lat, lng: gpsPos.lng })}
            disabled={!gpsPos}
            className={cn(
              'h-9 w-9 rounded-[10px] border border-ink-200 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors',
              gpsPos
                ? 'bg-violet-500 text-white cursor-pointer'
                : 'bg-card text-ink-300 cursor-not-allowed'
            )}
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>

        {/* GPS error */}
        {gpsError && (
          <div className="absolute top-4 left-1/2 z-[1001] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-card border border-rose-500 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
              <span className="text-[12px] text-ink-700">{gpsError}</span>
              <button onClick={() => setGpsError(null)} className="ml-1 cursor-pointer">
                <X className="h-3.5 w-3.5 text-ink-400" />
              </button>
            </div>
          </div>
        )}

        {/* GPS live bar */}
        {gpsTracking && gpsPos && (
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-card border border-violet-200 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
              <span className="gps-dot inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 bg-violet-500" />
              <span className="text-[12px] font-semibold text-violet-400">
                {trackedAs ? `${CLEANERS.find(c => c.id === trackedAs)?.name.split(' ')[0]} — Live` : 'GPS Active'}
              </span>
              <span className="text-[11px] text-ink-400">±{Math.round(gpsPos.accuracy)}m</span>
              <button
                onClick={stopGPS}
                className="ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-rose-500/10 border border-rose-500 text-rose-500 cursor-pointer"
              >
                <WifiOff className="h-2.5 w-2.5" /> Stop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
