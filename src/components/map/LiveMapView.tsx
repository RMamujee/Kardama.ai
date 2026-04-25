'use client'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CLEANERS, JOBS } from '@/lib/mock-data'
import { Cleaner, Job } from '@/types'
import { getStatusColor, getServiceLabel, formatTime, formatCurrency, cn } from '@/lib/utils'
import { MapSidebar } from './MapSidebar'
import {
  Users, MapPin, Navigation, Radio, Car, Map, Satellite,
  Crosshair, Wifi, WifiOff, X, AlertTriangle,
} from 'lucide-react'

// ─── Tiles ─────────────────────────────────────────────────────────────────────
const TILES = {
  streets:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

// ─── Traffic overlay ───────────────────────────────────────────────────────────
const TRAFFIC_ROADS = [
  { label: 'I-405', status: 'Heavy',    color: '#ef4444', weight: 5,
    positions: [[33.836,-118.342],[33.852,-118.354],[33.868,-118.366],[33.884,-118.378],[33.900,-118.390],[33.916,-118.402]] as [number,number][] },
  { label: 'I-710', status: 'Moderate', color: '#f59e0b', weight: 4,
    positions: [[33.763,-118.188],[33.790,-118.190],[33.815,-118.192],[33.840,-118.194],[33.865,-118.195],[33.890,-118.193]] as [number,number][] },
  { label: 'SR-91', status: 'Moderate', color: '#f59e0b', weight: 4,
    positions: [[33.863,-118.300],[33.864,-118.200],[33.865,-118.100],[33.866,-118.000],[33.867,-117.920]] as [number,number][] },
  { label: 'PCH',   status: 'Clear',    color: '#22c55e', weight: 3,
    positions: [[33.758,-118.120],[33.762,-118.190],[33.768,-118.260],[33.778,-118.330],[33.800,-118.380],[33.840,-118.418]] as [number,number][] },
  { label: 'I-110', status: 'Moderate', color: '#f59e0b', weight: 4,
    positions: [[33.790,-118.275],[33.825,-118.278],[33.860,-118.280],[33.895,-118.275],[33.930,-118.270]] as [number,number][] },
]

// ─── Layer config ──────────────────────────────────────────────────────────────
type LayerKey = 'teams' | 'jobs' | 'routes' | 'zone' | 'traffic'

const LAYER_CONFIG: {
  key: LayerKey; label: string
  Icon: React.FC<{ className?: string }>
  on: string; off: string
}[] = [
  { key: 'teams',   label: 'Teams',   Icon: Users,      on: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',     off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'jobs',    label: 'Jobs',    Icon: MapPin,     on: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40', off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'routes',  label: 'Routes',  Icon: Navigation, on: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',   off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'zone',    label: 'Zone',    Icon: Radio,      on: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'traffic', label: 'Traffic', Icon: Car,        on: 'bg-red-500/20 text-red-300 border border-red-500/40',         off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
]

// ─── GPS position type ─────────────────────────────────────────────────────────
interface GpsPos { lat: number; lng: number; accuracy: number; speed: number | null; heading: number | null; ts: number }

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

function createCleanerIcon(cleaner: Cleaner, isGpsTracked = false): L.DivIcon {
  const border = isGpsTracked ? '#3b82f6' : getStatusColor(cleaner.status)
  const glow   = isGpsTracked ? 'box-shadow:0 0 0 3px rgba(59,130,246,0.35),0 4px 14px rgba(0,0,0,0.35);' : 'box-shadow:0 4px 14px rgba(0,0,0,0.35);'
  const badge  = isGpsTracked
    ? `<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:#3b82f6;border:1.5px solid white;"></div>`
    : ''
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:40px;height:40px;">
      <div class="${isGpsTracked ? 'gps-dot' : ''}" style="width:40px;height:40px;border-radius:50%;background:${cleaner.color};border:3px solid ${border};display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:11px;${glow}font-family:-apple-system,sans-serif;">${cleaner.initials}</div>
      ${badge}
    </div>`,
    iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22],
  })
}

function createJobIcon(status: string): L.DivIcon {
  const colors: Record<string, string> = {
    scheduled: '#3b82f6', confirmed: '#22c55e', 'in-progress': '#f59e0b',
    completed: '#94a3b8', cancelled: '#ef4444',
  }
  const c = colors[status] || '#3b82f6'
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:6px;background:${c};border:2px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);"><div style="width:7px;height:7px;background:white;border-radius:50%;"></div></div>`,
    iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -15],
  })
}

const GPS_DOT_ICON = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px;">
    <div class="gps-dot" style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 10px rgba(59,130,246,0.5);position:absolute;top:1px;left:1px;"></div>
  </div>`,
  iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -14],
})

// ─── Fly-to helper (must live inside MapContainer) ────────────────────────────
function FlyTo({ lat, lng, zoom = 15 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 }) }, [lat, lng])
  return null
}

// ─── Haversine distance (km) ───────────────────────────────────────────────────
function distKm(a: [number, number], b: [number, number]): number {
  const R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLng = (b[1] - a[1]) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// ─── Main component ────────────────────────────────────────────────────────────
export function LiveMapView() {
  const [mounted, setMounted] = useState(false)
  const [selectedCleaner, setSelectedCleaner] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets')
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    teams: true, jobs: true, routes: true, zone: true, traffic: false,
  })

  // GPS state
  const [gpsPos, setGpsPos]           = useState<GpsPos | null>(null)
  const [gpsTrail, setGpsTrail]       = useState<[number, number][]>([])
  const [gpsTracking, setGpsTracking] = useState(false)
  const [gpsError, setGpsError]       = useState<string | null>(null)
  const [trackedAs, setTrackedAs]     = useState<string | null>(null) // cleaner ID
  const [flyTarget, setFlyTarget]     = useState<{ lat: number; lng: number } | null>(null)
  // Live-updated cleaner positions (GPS overrides)
  const [cleanerPos, setCleanerPos]   = useState<Record<string, { lat: number; lng: number }>>({})
  const watchRef = useRef<number | null>(null)

  useEffect(() => { fixLeafletIcons(); setMounted(true) }, [])

  function toggle(key: LayerKey) {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ─── GPS control ──────────────────────────────────────────────────────────
  function startGPS(cleanerId: string | null = null) {
    if (!navigator.geolocation) { setGpsError('GPS not available in this browser'); return }
    setGpsError(null)
    setGpsTrail([])
    setTrackedAs(cleanerId)
    setGpsTracking(true)

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy, speed, heading } = pos.coords
        const p: GpsPos = { lat, lng, accuracy, speed, heading, ts: pos.timestamp }
        setGpsPos(p)
        setGpsTrail(prev => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1]
            if (distKm(last, [lat, lng]) < 0.005) return prev // ignore micro jitter < 5m
          }
          return [...prev, [lat, lng]]
        })
        // Override the assigned cleaner's map position
        if (cleanerId) {
          setCleanerPos(prev => ({ ...prev, [cleanerId]: { lat, lng } }))
        }
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied — allow in browser settings',
          2: 'Position unavailable — check your device GPS',
          3: 'GPS timed out — try again outdoors',
        }
        setGpsError(msgs[err.code] || 'GPS error')
        setGpsTracking(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  function stopGPS() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setGpsTracking(false)
    setTrackedAs(null)
    setCleanerPos({})
  }

  function flyToGPS() {
    if (gpsPos) setFlyTarget({ lat: gpsPos.lat, lng: gpsPos.lng })
  }

  // Trail distance in km
  const trailKm = gpsTrail.length > 1
    ? gpsTrail.slice(1).reduce((sum, p, i) => sum + distKm(gpsTrail[i], p), 0)
    : 0

  const trackedCleaner = CLEANERS.find(c => c.id === trackedAs)

  if (!mounted) return null

  const activeJobs = JOBS.filter(j => {
    if (!showCompleted && j.status === 'completed') return false
    if (filterStatus !== 'all' && j.status !== filterStatus) return false
    return true
  })

  const routes = CLEANERS
    .filter(c => c.currentJobId && (c.status === 'en-route' || c.status === 'cleaning'))
    .map(c => {
      const job = JOBS.find(j => j.id === c.currentJobId)
      if (!job) return null
      const pos = cleanerPos[c.id] ?? { lat: c.currentLat, lng: c.currentLng }
      return {
        cleaner: c,
        positions: [[pos.lat, pos.lng], [job.lat, job.lng]] as [number, number][],
        isDashed: c.status === 'en-route',
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return (
    <div className="flex h-full">
      <MapSidebar
        cleaners={CLEANERS}
        jobs={activeJobs}
        selectedCleaner={selectedCleaner}
        onSelectCleaner={setSelectedCleaner}
        showCompleted={showCompleted}
        onToggleCompleted={setShowCompleted}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        trackedCleaner={trackedAs}
        gpsTracking={gpsTracking}
        onStartGPS={startGPS}
        onStopGPS={stopGPS}
      />

      <div className="relative flex-1 overflow-hidden">
        <MapContainer
          center={[33.87, -118.28]} zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer key={mapType} url={TILES[mapType]}
            attribution={mapType === 'streets' ? '&copy; OpenStreetMap' : '&copy; Esri'}
            maxZoom={19}
          />

          {/* Fly-to trigger */}
          {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

          {/* Traffic */}
          {layers.traffic && TRAFFIC_ROADS.map((r, i) => (
            <Polyline key={`t${i}`} positions={r.positions} color={r.color} weight={r.weight} opacity={0.75}>
              <Popup><div className="p-1"><p className="font-semibold text-sm">{r.label}</p><p className="text-xs" style={{ color: r.color }}>{r.status} traffic</p></div></Popup>
            </Polyline>
          ))}

          {/* Zone */}
          {layers.zone && (
            <Circle center={[33.7701, -118.1937]} radius={24140}
              pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.04, weight: 1.5, dashArray: '6 4' }}
            />
          )}

          {/* Routes */}
          {layers.routes && routes.map((route, i) => (
            <Polyline key={`r${i}`} positions={route.positions} color={route.cleaner.color}
              weight={3} opacity={0.85} dashArray={route.isDashed ? '8 6' : undefined}
            />
          ))}

          {/* GPS accuracy circle */}
          {gpsTracking && gpsPos && (
            <Circle center={[gpsPos.lat, gpsPos.lng]} radius={Math.max(gpsPos.accuracy, 10)}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1.5 }}
            />
          )}

          {/* GPS trail */}
          {gpsTracking && gpsTrail.length > 1 && (
            <Polyline positions={gpsTrail} color="#3b82f6" weight={3} opacity={0.65} dashArray="5 5" />
          )}

          {/* GPS dot — shown only when NOT assigned to a specific cleaner */}
          {gpsTracking && gpsPos && !trackedAs && (
            <Marker position={[gpsPos.lat, gpsPos.lng]} icon={GPS_DOT_ICON}>
              <Popup>
                <div className="p-1 min-w-[140px]">
                  <p className="font-semibold text-sm">Your Location</p>
                  <p className="text-xs text-slate-500">±{Math.round(gpsPos.accuracy)}m accuracy</p>
                  {gpsPos.speed != null && <p className="text-xs text-slate-500">{(gpsPos.speed * 3.6).toFixed(1)} km/h</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Job markers */}
          {layers.jobs && activeJobs.map(job => (
            <Marker key={job.id} position={[job.lat, job.lng]} icon={createJobIcon(job.status)}>
              <Popup>
                <div className="min-w-[180px] p-1">
                  <p className="font-semibold text-sm">{job.address.split(',')[0]}</p>
                  <p className="text-xs text-slate-500">{getServiceLabel(job.serviceType)}</p>
                  <p className="text-xs text-slate-500">{formatTime(job.scheduledTime)} · {job.estimatedDuration} min</p>
                  <p className="text-xs font-semibold text-green-600 mt-1">{formatCurrency(job.price)}</p>
                  <span style={{ display:'inline-block',marginTop:4,padding:'2px 8px',borderRadius:12,fontSize:10,background:'#e0f2fe',color:'#0369a1',textTransform:'capitalize' }}>{job.status}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Cleaner markers */}
          {layers.teams && CLEANERS.map(cleaner => {
            const isTracked = cleaner.id === trackedAs
            const pos = cleanerPos[cleaner.id] ?? { lat: cleaner.currentLat, lng: cleaner.currentLng }
            return (
              <Marker key={cleaner.id} position={[pos.lat, pos.lng]}
                icon={createCleanerIcon(cleaner, isTracked)}
                eventHandlers={{ click: () => setSelectedCleaner(cleaner.id) }}
              >
                <Popup>
                  <div className="min-w-[160px] p-1">
                    <p className="font-semibold">{cleaner.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{cleaner.status.replace('-', ' ')}</p>
                    {isTracked && <p className="text-xs text-blue-500 font-medium mt-1">📡 Live GPS tracking</p>}
                    {cleaner.currentJobId && <p className="mt-1 text-xs text-blue-600">On job #{cleaner.currentJobId}</p>}
                    <p className="mt-1 text-xs text-slate-400">{cleaner.homeAreaName} · ⭐ {cleaner.rating}</p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* ── Map type switcher — top right ──────────────────────────────── */}
        <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-lg border border-[#1e2a3a] shadow-lg">
          {(['streets', 'satellite'] as const).map((type, i) => (
            <button key={type} onClick={() => setMapType(type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                i > 0 && 'border-l border-[#1e2a3a]',
                mapType === type ? 'bg-indigo-600 text-white' : 'bg-[#111827]/90 text-slate-400 hover:text-white hover:bg-[#1a2537]'
              )}
            >
              {type === 'streets' ? <Map className="h-3.5 w-3.5" /> : <Satellite className="h-3.5 w-3.5" />}
              {type === 'streets' ? 'Map' : 'Satellite'}
            </button>
          ))}
        </div>

        {/* ── My Location button — bottom right ──────────────────────────── */}
        <div className="absolute bottom-24 right-3 z-[1000] flex flex-col gap-2">
          <button
            onClick={flyToGPS}
            disabled={!gpsPos}
            title={gpsPos ? 'Center on my location' : 'Start GPS to use'}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all',
              gpsPos
                ? 'bg-[#111827] border-[#1e2a3a] text-blue-400 hover:bg-[#1a2537] hover:border-blue-500/40'
                : 'bg-[#0d1321]/80 border-[#1e2a3a] text-slate-700 cursor-not-allowed'
            )}
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>

        {/* ── GPS status / error banner ───────────────────────────────────── */}
        {gpsError && (
          <div className="absolute left-1/2 top-14 z-[1001] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 shadow-lg backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-300">{gpsError}</span>
              <button onClick={() => setGpsError(null)} className="ml-2 text-red-400 hover:text-red-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Live GPS info card ──────────────────────────────────────────── */}
        {gpsTracking && gpsPos && (
          <div className="absolute bottom-24 left-1/2 z-[1000] -translate-x-1/2">
            <div className="flex items-center gap-4 rounded-2xl border border-blue-500/30 bg-[#0d1321]/95 backdrop-blur-md px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              {/* Pulsing dot */}
              <div className="relative flex-shrink-0">
                <div className="gps-dot h-3 w-3 rounded-full bg-blue-500" />
              </div>

              {/* Who's being tracked */}
              <div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-300">
                    {trackedCleaner ? `Tracking ${trackedCleaner.name.split(' ')[0]}` : 'GPS Active'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {gpsPos.lat.toFixed(5)}, {gpsPos.lng.toFixed(5)}
                </p>
              </div>

              <div className="h-8 w-px bg-[#1e2a3a]" />

              {/* Accuracy */}
              <div className="text-center">
                <p className="text-xs font-semibold text-white">±{Math.round(gpsPos.accuracy)}m</p>
                <p className="text-[10px] text-slate-500">accuracy</p>
              </div>

              {/* Speed */}
              {gpsPos.speed != null && (
                <>
                  <div className="h-8 w-px bg-[#1e2a3a]" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-white">{(gpsPos.speed * 3.6).toFixed(0)}</p>
                    <p className="text-[10px] text-slate-500">km/h</p>
                  </div>
                </>
              )}

              {/* Trail */}
              {trailKm > 0.01 && (
                <>
                  <div className="h-8 w-px bg-[#1e2a3a]" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-white">{(trailKm * 1000).toFixed(0)}m</p>
                    <p className="text-[10px] text-slate-500">traveled</p>
                  </div>
                </>
              )}

              <div className="h-8 w-px bg-[#1e2a3a]" />

              {/* Stop button */}
              <button
                onClick={stopGPS}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors"
              >
                <WifiOff className="h-3 w-3" />
                Stop
              </button>
            </div>
          </div>
        )}

        {/* ── Layer toggles — bottom center ───────────────────────────────── */}
        <div className="absolute bottom-6 left-1/2 z-[1000] -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-2xl border border-[#1e2a3a] bg-[#0d1321]/95 backdrop-blur-md px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {LAYER_CONFIG.map(({ key, label, Icon, on, off }) => (
              <button key={key} onClick={() => toggle(key)}
                className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150', layers[key] ? on : off)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {key === 'traffic' && layers.traffic && (
                  <span className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {TRAFFIC_ROADS.filter(r => r.status === 'Heavy').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Traffic legend */}
        {layers.traffic && (
          <div className="absolute bottom-20 left-1/2 z-[1000] -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-xl border border-[#1e2a3a] bg-[#0d1321]/95 backdrop-blur-md px-4 py-2 shadow-lg">
              {[['#22c55e','Clear'],['#f59e0b','Moderate'],['#ef4444','Heavy']].map(([color,label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="h-1 w-5 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active layer chips — top left */}
        <div className="absolute left-3 top-3 z-[1000] flex flex-wrap gap-1">
          {(Object.entries(layers) as [LayerKey, boolean][]).filter(([,on]) => on).map(([key]) => {
            const cfg = LAYER_CONFIG.find(c => c.key === key)!
            return (
              <div key={key} className="flex items-center gap-1 rounded-full bg-[#0d1321]/90 backdrop-blur border border-[#1e2a3a] px-2 py-0.5">
                <cfg.Icon className="h-2.5 w-2.5 text-slate-400" />
                <span className="text-[10px] text-slate-400">{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
