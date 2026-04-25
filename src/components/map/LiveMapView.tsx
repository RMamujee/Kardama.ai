'use client'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CLEANERS, JOBS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { buildOptimizedRoutes, TeamRoute, RouteStop } from '@/lib/routing-engine'
import { fetchTeamRoute, RealRoute, CONGESTION_COLOR } from '@/lib/mapbox-routing'
import { RoutingPanel } from './RoutingPanel'
import { Crosshair, WifiOff, AlertTriangle, X, Loader2 } from 'lucide-react'

// ─── Tile sources ──────────────────────────────────────────────────────────────
// Mapbox Navigation Day: traffic baked into every road on the base map
const TILE_MAPBOX = (token: string) =>
  `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/256/{z}/{x}/{y}{r}?access_token=${token}`
const TILE_FALLBACK = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_SAT     = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ATTR_MAPBOX  = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const ATTR_CARTO   = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>'
const ATTR_SAT     = '© Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics'

// ─── Icon factories ────────────────────────────────────────────────────────────
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
      border:2.5px solid rgba(255,255,255,0.95);
      display:flex;align-items:center;justify-content:center;
      font-weight:800;color:white;font-size:12px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
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
      border:2.5px solid rgba(255,255,255,0.95);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;color:white;font-size:10px;
      box-shadow:0 2px 10px rgba(0,0,0,0.28);
      font-family:-apple-system,sans-serif;
    ">${initials}</div>`,
    iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -19],
  })
}

const GPS_ICON = L.divIcon({
  className: '',
  html: `<div class="gps-dot" style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 10px rgba(37,99,235,0.55);"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -11],
})

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 }) }, [lat, lng])
  return null
}

interface GpsPos { lat: number; lng: number; accuracy: number; speed: number | null }

// ─── Component ─────────────────────────────────────────────────────────────────
export function LiveMapView() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

  const [mounted, setMounted]         = useState(false)
  const [showCongestion, setShowCongestion] = useState(true)
  const [satellite, setSatellite]     = useState(false)
  const [routes, setRoutes]           = useState<TeamRoute[]>([])
  const [realRoutes, setRealRoutes]   = useState<Record<string, RealRoute | null>>({})
  const [loadingRoutes, setLoadingRoutes] = useState(false)

  const [gpsPos, setGpsPos]           = useState<GpsPos | null>(null)
  const [gpsTrail, setGpsTrail]       = useState<[number,number][]>([])
  const [gpsTracking, setGpsTracking] = useState(false)
  const [trackedAs, setTrackedAs]     = useState<string | null>(null)
  const [gpsError, setGpsError]       = useState<string | null>(null)
  const [flyTarget, setFlyTarget]     = useState<{ lat: number; lng: number } | null>(null)
  const watchRef   = useRef<number | null>(null)
  const fetchAbort = useRef<AbortController | null>(null)

  // Build TSP routes on mount
  useEffect(() => {
    fixLeafletIcons()
    setMounted(true)
    const todayStr = new Date().toISOString().split('T')[0]
    const todayJobs = JOBS.filter(j => j.scheduledDate === todayStr)
    setRoutes(buildOptimizedRoutes(todayJobs, CLEANERS))
  }, [])

  // Fetch real road geometry from Mapbox whenever TSP routes change
  useEffect(() => {
    if (!mapboxToken || routes.length === 0) return

    // Cancel any in-flight fetches
    fetchAbort.current?.abort()
    fetchAbort.current = new AbortController()

    setLoadingRoutes(true)

    Promise.all(
      routes.map(route => {
        const waypoints = [
          { lat: route.startLat, lng: route.startLng },
          ...route.stops
            .filter(s => s.status !== 'cancelled')
            .map(s => ({ lat: s.job.lat, lng: s.job.lng })),
        ]
        return fetchTeamRoute(route.teamId, waypoints, mapboxToken)
      })
    ).then(results => {
      const map: Record<string, RealRoute | null> = {}
      results.forEach((r, i) => { map[routes[i].teamId] = r })
      setRealRoutes(map)
      setLoadingRoutes(false)
    }).catch(() => setLoadingRoutes(false))
  }, [routes, mapboxToken])

  function refreshRoutes(overrides: Record<string, RouteStop['status']>) {
    const todayStr = new Date().toISOString().split('T')[0]
    const todayJobs = JOBS
      .filter(j => j.scheduledDate === todayStr)
      .map(j => overrides[j.id] === 'cancelled' ? { ...j, status: 'cancelled' as const } : j)
    setRoutes(buildOptimizedRoutes(todayJobs, CLEANERS))
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

  const tileUrl = satellite ? TILE_SAT
    : mapboxToken ? TILE_MAPBOX(mapboxToken)
    : TILE_FALLBACK
  const tileAttr = satellite ? ATTR_SAT : mapboxToken ? ATTR_MAPBOX : ATTR_CARTO
  const tileKey  = satellite ? 'sat' : mapboxToken ? 'mapbox' : 'fallback'

  return (
    <div className="flex h-full">
      <RoutingPanel
        routes={routes}
        cleaners={CLEANERS}
        onRefreshRoutes={refreshRoutes}
        gpsTracking={gpsTracking}
        trackedCleaner={trackedAs}
        onStartGPS={startGPS}
        onStopGPS={stopGPS}
        onFlyTo={(lat, lng) => setFlyTarget({ lat, lng })}
      />

      <div className="relative flex-1 overflow-hidden">
        <MapContainer center={[33.87, -118.26]} zoom={11}
          style={{ height: '100%', width: '100%' }} zoomControl={false}>

          <TileLayer key={tileKey} url={tileUrl} attribution={tileAttr} maxZoom={19} />

          {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

          {/* Routes — real road geometry when available, straight-line fallback */}
          {routes.map(route => {
            const real = realRoutes[route.teamId]

            return (
              <span key={route.teamId}>
                {real
                  ? real.segments.map((seg, i) => (
                      <Polyline key={i}
                        positions={seg.positions}
                        color={showCongestion ? CONGESTION_COLOR[seg.congestion] ?? route.color : route.color}
                        weight={5}
                        opacity={0.9}
                      />
                    ))
                  : /* Dashed placeholder while loading */
                    <Polyline positions={route.polyline} color={route.color}
                      weight={3.5} opacity={0.5} dashArray="8 6" />
                }

                {/* Team start marker */}
                <Marker position={[route.startLat, route.startLng]}
                  icon={teamBaseIcon(route.cleanerNames.map(n => n[0]).join(''), route.color)}>
                  <Popup>
                    <div style={{ padding: 4 }}>
                      <b>{route.cleanerNames.join(' + ')}</b>
                      <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        Start · {route.stops.length} stops · {route.totalDriveMin} min
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Stop markers */}
                {route.stops.map(stop => (
                  <Marker key={stop.job.id}
                    position={[stop.job.lat, stop.job.lng]}
                    icon={stopIcon(stop.sequence, route.color, stop.status)}>
                    <Popup>
                      <div style={{ minWidth: 165, padding: 4 }}>
                        <b style={{ fontSize: 13 }}>Stop {stop.sequence} · {route.cleanerNames.join(' + ')}</b>
                        <p style={{ fontSize: 12, marginTop: 3 }}>{stop.job.address.split(',')[0]}</p>
                        <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                          {stop.startTime} · {stop.job.estimatedDuration} min
                        </p>
                        <p style={{ fontSize: 11, color: CONGESTION_COLOR[stop.drive.traffic] ?? '#666', marginTop: 2 }}>
                          Drive: {stop.drive.minutes} min · {stop.drive.traffic}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </span>
            )
          })}

          {/* GPS accuracy ring */}
          {gpsTracking && gpsPos && (
            <Circle center={[gpsPos.lat, gpsPos.lng]} radius={Math.max(gpsPos.accuracy, 10)}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.07, weight: 1.5 }} />
          )}

          {/* GPS trail */}
          {gpsTracking && gpsTrail.length > 1 && (
            <Polyline positions={gpsTrail} color="#2563eb" weight={3} opacity={0.5} dashArray="5 5" />
          )}

          {/* GPS dot */}
          {gpsTracking && gpsPos && (
            <Marker position={[gpsPos.lat, gpsPos.lng]} icon={GPS_ICON}>
              <Popup>
                <div style={{ padding: 4 }}>
                  <b>{trackedAs ? `Tracking ${CLEANERS.find(c => c.id === trackedAs)?.name.split(' ')[0]}` : 'Your Location'}</b>
                  <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>±{Math.round(gpsPos.accuracy)}m</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* ── Map controls — bottom right ───────────────────────────────── */}
        <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">

          {/* Congestion color toggle */}
          <button onClick={() => setShowCongestion(v => !v)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm transition-all',
              showCongestion
                ? 'border-orange-300 bg-white/95 text-orange-600'
                : 'border-slate-200 bg-white/95 text-slate-500 hover:text-slate-800 hover:border-slate-300'
            )}>
            <span className="flex gap-0.5">
              <span className="inline-block h-2.5 w-2 rounded-sm bg-green-500" />
              <span className="inline-block h-2.5 w-2 rounded-sm bg-orange-400" />
              <span className="inline-block h-2.5 w-2 rounded-sm bg-red-500" />
            </span>
            {showCongestion ? 'Traffic On' : 'Traffic Off'}
            {loadingRoutes && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          </button>

          {/* Map / Satellite */}
          <div className="flex overflow-hidden rounded-xl border border-slate-200 shadow-lg">
            {([['Map', false], ['Satellite', true]] as const).map(([label, isSat], i) => (
              <button key={label} onClick={() => setSatellite(isSat)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold transition-colors',
                  i > 0 && 'border-l border-slate-200',
                  satellite === isSat ? 'bg-slate-800 text-white' : 'bg-white/95 text-slate-500 hover:text-slate-800'
                )}>{label}</button>
            ))}
          </div>

          {/* Centre on GPS */}
          <button onClick={() => gpsPos && setFlyTarget({ lat: gpsPos.lat, lng: gpsPos.lng })}
            disabled={!gpsPos}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl border shadow-lg transition-all',
              gpsPos ? 'border-blue-300 bg-white/95 text-blue-600 hover:bg-blue-50'
                     : 'border-slate-200 bg-white/80 text-slate-300 cursor-not-allowed'
            )}>
            <Crosshair className="h-4 w-4" />
          </button>
        </div>

        {/* Congestion legend */}
        {showCongestion && (
          <div className="absolute bottom-6 left-4 z-[1000]">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-2 shadow-lg">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Live traffic</span>
              {([['#22c55e','Low'],['#f97316','Moderate'],['#ef4444','Heavy'],['#7f1d1d','Severe']] as const).map(([c,l]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className="h-2.5 w-5 rounded-full" style={{ background: c }} />
                  <span className="text-[10px] text-slate-500">{l}</span>
                </div>
              ))}
              {!mapboxToken && (
                <span className="text-[10px] text-amber-600 font-medium ml-1">⚠ No Mapbox token</span>
              )}
            </div>
          </div>
        )}

        {/* No-token banner */}
        {!mapboxToken && (
          <div className="absolute top-4 left-1/2 z-[1001] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-white/95 px-4 py-2.5 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-800">
                Add <code className="font-mono text-amber-700">NEXT_PUBLIC_MAPBOX_TOKEN</code> to <code className="font-mono text-amber-700">.env.local</code> for real traffic data
              </span>
            </div>
          </div>
        )}

        {/* GPS error */}
        {gpsError && (
          <div className="absolute top-4 left-1/2 z-[1001] -translate-x-1/2 mt-12">
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-white/95 px-4 py-2.5 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-700">{gpsError}</span>
              <button onClick={() => setGpsError(null)}><X className="h-3.5 w-3.5 text-red-400 ml-2" /></button>
            </div>
          </div>
        )}

        {/* GPS live bar */}
        {gpsTracking && gpsPos && (
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white/95 px-4 py-2.5 shadow-lg">
              <span className="gps-dot h-2.5 w-2.5 rounded-full bg-blue-600 inline-block flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-700">
                {trackedAs ? `${CLEANERS.find(c => c.id === trackedAs)?.name.split(' ')[0]} — Live` : 'GPS Active'}
              </span>
              <span className="text-[10px] text-slate-400">±{Math.round(gpsPos.accuracy)}m</span>
              <button onClick={stopGPS}
                className="ml-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-100 flex items-center gap-1">
                <WifiOff className="h-2.5 w-2.5" /> Stop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
