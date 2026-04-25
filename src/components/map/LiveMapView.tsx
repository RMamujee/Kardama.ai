'use client'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CLEANERS, JOBS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { buildOptimizedRoutes, TeamRoute, RouteStop } from '@/lib/routing-engine'
import { RoutingPanel } from './RoutingPanel'
import { Car, Crosshair, WifiOff, Wifi, AlertTriangle, X } from 'lucide-react'

// ─── Tile sources ──────────────────────────────────────────────────────────────
// CartoDB Dark Matter: clean, minimal, perfect for routing
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_SAT  = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ATTR_DARK = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
const ATTR_SAT  = '&copy; Esri &mdash; Source: Esri, Maxar, GeoEye, Earthstar Geographics'

// ─── Simulated traffic roads ──────────────────────────────────────────────────
const TRAFFIC = [
  { label: 'I-405', color: '#ef4444', weight: 5,
    pos: [[33.836,-118.342],[33.852,-118.354],[33.868,-118.366],[33.884,-118.378],[33.900,-118.390],[33.916,-118.402]] as [number,number][] },
  { label: 'I-710', color: '#f59e0b', weight: 4,
    pos: [[33.763,-118.188],[33.790,-118.190],[33.815,-118.192],[33.840,-118.194],[33.865,-118.195],[33.890,-118.193]] as [number,number][] },
  { label: 'SR-91', color: '#f59e0b', weight: 4,
    pos: [[33.863,-118.300],[33.864,-118.200],[33.865,-118.100],[33.866,-118.000],[33.867,-117.920]] as [number,number][] },
  { label: 'PCH',   color: '#22c55e', weight: 3,
    pos: [[33.758,-118.120],[33.762,-118.190],[33.768,-118.260],[33.778,-118.330],[33.800,-118.380],[33.840,-118.418]] as [number,number][] },
  { label: 'I-110', color: '#f59e0b', weight: 4,
    pos: [[33.790,-118.275],[33.825,-118.278],[33.860,-118.280],[33.895,-118.275],[33.930,-118.270]] as [number,number][] },
]

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
  const opacity = status === 'cancelled' ? 0.35 : status === 'complete' ? 0.6 : 1
  const check = status === 'complete' ? '✓' : status === 'cancelled' ? '×' : String(seq)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${color};opacity:${opacity};
      border:2.5px solid rgba(255,255,255,0.85);
      display:flex;align-items:center;justify-content:center;
      font-weight:800;color:white;font-size:13px;
      box-shadow:0 3px 12px rgba(0,0,0,0.5);
      font-family:-apple-system,sans-serif;
    ">${check}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
  })
}

function teamBaseIcon(initials: string, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:8px;
      background:${color};
      border:2px solid rgba(255,255,255,0.6);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;color:white;font-size:10px;
      box-shadow:0 3px 10px rgba(0,0,0,0.4);
      font-family:-apple-system,sans-serif;
    ">${initials}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  })
}

const GPS_ICON = L.divIcon({
  className: '',
  html: `<div class="gps-dot" style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 10px rgba(59,130,246,0.5);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12],
})

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 }) }, [lat, lng])
  return null
}

interface GpsPos { lat: number; lng: number; accuracy: number; speed: number | null }

// ─── Component ─────────────────────────────────────────────────────────────────
export function LiveMapView() {
  const [mounted, setMounted]         = useState(false)
  const [showTraffic, setShowTraffic] = useState(false)
  const [satellite, setSatellite]     = useState(false)
  const [routes, setRoutes]           = useState<TeamRoute[]>([])

  // GPS
  const [gpsPos, setGpsPos]           = useState<GpsPos | null>(null)
  const [gpsTrail, setGpsTrail]       = useState<[number,number][]>([])
  const [gpsTracking, setGpsTracking] = useState(false)
  const [trackedAs, setTrackedAs]     = useState<string | null>(null)
  const [gpsError, setGpsError]       = useState<string | null>(null)
  const [flyTarget, setFlyTarget]     = useState<{ lat: number; lng: number } | null>(null)
  const watchRef = useRef<number | null>(null)

  useEffect(() => {
    fixLeafletIcons()
    setMounted(true)
    // Build initial routes from today's jobs
    const todayStr = new Date().toISOString().split('T')[0]
    const todayJobs = JOBS.filter(j => j.scheduledDate === todayStr)
    setRoutes(buildOptimizedRoutes(todayJobs, CLEANERS))
  }, [])

  // Called from RoutingPanel when user cancels/adds a stop → re-optimise
  function refreshRoutes(overrides: Record<string, RouteStop['status']>) {
    const todayStr = new Date().toISOString().split('T')[0]
    const todayJobs = JOBS
      .filter(j => j.scheduledDate === todayStr)
      .map(j => overrides[j.id] === 'cancelled' ? { ...j, status: 'cancelled' as const } : j)
    setRoutes(buildOptimizedRoutes(todayJobs, CLEANERS))
  }

  // GPS
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
          1: 'Location permission denied — check browser settings',
          2: 'Position unavailable — try outdoors',
          3: 'GPS timed out',
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

  return (
    <div className="flex h-full">
      {/* ── Routing panel ─────────────────────────────────────────── */}
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

      {/* ── Map ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <MapContainer center={[33.87, -118.28]} zoom={11}
          style={{ height: '100%', width: '100%' }} zoomControl={false}>

          <TileLayer key={satellite ? 'sat' : 'dark'}
            url={satellite ? TILE_SAT : TILE_DARK}
            attribution={satellite ? ATTR_SAT : ATTR_DARK}
            maxZoom={19}
          />

          {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

          {/* Traffic overlay */}
          {showTraffic && TRAFFIC.map((r, i) => (
            <Polyline key={i} positions={r.pos} color={r.color} weight={r.weight} opacity={0.75}>
              <Popup><div style={{ padding: 4 }}><b>{r.label}</b><br /><span style={{ color: r.color, fontSize: 12 }}>{r.color === '#ef4444' ? 'Heavy' : r.color === '#f59e0b' ? 'Moderate' : 'Clear'}</span></div></Popup>
            </Polyline>
          ))}

          {/* Route polylines + stop markers */}
          {routes.map(route => (
            <span key={route.teamId}>
              {/* Connecting line */}
              <Polyline
                positions={route.polyline}
                color={route.color}
                weight={3.5}
                opacity={0.8}
                dashArray={undefined}
              />

              {/* Team base marker */}
              <Marker
                position={[route.startLat, route.startLng]}
                icon={teamBaseIcon(route.cleanerNames.map(n => n[0]).join(''), route.color)}
              >
                <Popup>
                  <div style={{ padding: 4 }}>
                    <b>{route.cleanerNames.join(' + ')}</b>
                    <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Team start · {route.stops.length} stops</p>
                  </div>
                </Popup>
              </Marker>

              {/* Stop markers */}
              {route.stops.map(stop => (
                <Marker
                  key={stop.job.id}
                  position={[stop.job.lat, stop.job.lng]}
                  icon={stopIcon(stop.sequence, route.color, stop.status)}
                >
                  <Popup>
                    <div style={{ minWidth: 170, padding: 4 }}>
                      <b style={{ fontSize: 13 }}>Stop {stop.sequence}</b>
                      <p style={{ fontSize: 12, marginTop: 2 }}>{stop.job.address.split(',')[0]}</p>
                      <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {stop.startTime} · {stop.job.estimatedDuration} min
                      </p>
                      <p style={{ fontSize: 11, color: stop.drive.traffic === 'heavy' ? '#ef4444' : stop.drive.traffic === 'moderate' ? '#f59e0b' : '#22c55e', marginTop: 2 }}>
                        {stop.drive.minutes} min drive ({stop.drive.traffic} traffic)
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </span>
          ))}

          {/* GPS accuracy ring */}
          {gpsTracking && gpsPos && (
            <Circle center={[gpsPos.lat, gpsPos.lng]} radius={Math.max(gpsPos.accuracy, 10)}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1.5 }}
            />
          )}

          {/* GPS trail */}
          {gpsTracking && gpsTrail.length > 1 && (
            <Polyline positions={gpsTrail} color="#3b82f6" weight={3} opacity={0.6} dashArray="5 5" />
          )}

          {/* GPS dot */}
          {gpsTracking && gpsPos && (
            <Marker position={[gpsPos.lat, gpsPos.lng]} icon={GPS_ICON}>
              <Popup>
                <div style={{ padding: 4 }}>
                  <b>{trackedAs ? `Tracking ${CLEANERS.find(c => c.id === trackedAs)?.name.split(' ')[0]}` : 'Your Location'}</b>
                  <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>±{Math.round(gpsPos.accuracy)}m accuracy</p>
                  {gpsPos.speed != null && <p style={{ fontSize: 11, color: '#666' }}>{(gpsPos.speed * 3.6).toFixed(1)} km/h</p>}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* ── Map type + Traffic — bottom right buttons ─────────── */}
        <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
          {/* Traffic toggle */}
          <button
            onClick={() => setShowTraffic(v => !v)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all',
              showTraffic
                ? 'border-red-500/40 bg-red-500/15 text-red-300'
                : 'border-[#1e2a3a] bg-[#0d1321]/90 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            )}
          >
            <Car className="h-3.5 w-3.5" />
            Traffic{showTraffic ? ' On' : ''}
            {showTraffic && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">1</span>
            )}
          </button>

          {/* Map / Satellite */}
          <div className="flex overflow-hidden rounded-xl border border-[#1e2a3a] shadow-lg">
            {([['Map', false], ['Satellite', true]] as const).map(([label, isSat], i) => (
              <button key={label} onClick={() => setSatellite(isSat)}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors',
                  i > 0 && 'border-l border-[#1e2a3a]',
                  satellite === isSat ? 'bg-indigo-600 text-white' : 'bg-[#111827]/90 text-slate-400 hover:text-white'
                )}
              >{label}</button>
            ))}
          </div>

          {/* My location */}
          <button onClick={() => gpsPos && setFlyTarget({ lat: gpsPos.lat, lng: gpsPos.lng })}
            disabled={!gpsPos}
            title="Centre on my GPS location"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl border shadow-lg transition-all',
              gpsPos ? 'border-blue-500/40 bg-[#111827] text-blue-400 hover:bg-[#1a2537]'
                     : 'border-[#1e2a3a] bg-[#0d1321]/80 text-slate-700 cursor-not-allowed'
            )}
          ><Crosshair className="h-4 w-4" /></button>
        </div>

        {/* Traffic legend (only when on) */}
        {showTraffic && (
          <div className="absolute bottom-6 left-4 z-[1000]">
            <div className="flex items-center gap-3 rounded-xl border border-[#1e2a3a] bg-[#0d1321]/95 backdrop-blur-md px-4 py-2 shadow-lg">
              {[['#22c55e','Clear'],['#f59e0b','Moderate'],['#ef4444','Heavy']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="h-1 w-5 rounded-full" style={{ background: c }} />
                  <span className="text-[10px] text-slate-400">{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GPS error */}
        {gpsError && (
          <div className="absolute top-4 left-1/2 z-[1001] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-[#0d1321]/95 backdrop-blur px-4 py-2.5 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-red-300">{gpsError}</span>
              <button onClick={() => setGpsError(null)}><X className="h-3.5 w-3.5 text-red-400 ml-2" /></button>
            </div>
          </div>
        )}

        {/* GPS live bar */}
        {gpsTracking && gpsPos && (
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-[#0d1321]/95 backdrop-blur px-4 py-2.5 shadow-lg">
              <span className="gps-dot h-2.5 w-2.5 rounded-full bg-blue-500 inline-block flex-shrink-0" />
              <span className="text-xs font-medium text-blue-300">
                {trackedAs ? `${CLEANERS.find(c => c.id === trackedAs)?.name.split(' ')[0]} — Live` : 'GPS Active'}
              </span>
              <span className="text-[10px] text-slate-500">±{Math.round(gpsPos.accuracy)}m</span>
              <button onClick={stopGPS} className="ml-1 rounded-md bg-red-500/15 border border-red-500/20 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/25 flex items-center gap-1">
                <WifiOff className="h-2.5 w-2.5" /> Stop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
