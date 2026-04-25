'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CLEANERS, JOBS } from '@/lib/mock-data'
import { Cleaner, Job } from '@/types'
import { getStatusColor, getServiceLabel, formatTime, formatCurrency, cn } from '@/lib/utils'
import { MapSidebar } from './MapSidebar'
import { Users, MapPin, Navigation, Radio, Car, Map, Satellite } from 'lucide-react'

// ─── Tile sources ──────────────────────────────────────────────────────────────
const TILES = {
  streets:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

// ─── Simulated LA-area traffic (no API key needed) ────────────────────────────
const TRAFFIC_ROADS = [
  {
    label: 'I-405',
    status: 'Heavy',
    color: '#ef4444',
    weight: 5,
    positions: [
      [33.836, -118.342], [33.852, -118.354], [33.868, -118.366],
      [33.884, -118.378], [33.900, -118.390], [33.916, -118.402],
    ] as [number, number][],
  },
  {
    label: 'I-710',
    status: 'Moderate',
    color: '#f59e0b',
    weight: 4,
    positions: [
      [33.763, -118.188], [33.790, -118.190], [33.815, -118.192],
      [33.840, -118.194], [33.865, -118.195], [33.890, -118.193],
    ] as [number, number][],
  },
  {
    label: 'SR-91',
    status: 'Moderate',
    color: '#f59e0b',
    weight: 4,
    positions: [
      [33.863, -118.300], [33.864, -118.200], [33.865, -118.100],
      [33.866, -118.000], [33.867, -117.920],
    ] as [number, number][],
  },
  {
    label: 'PCH',
    status: 'Clear',
    color: '#22c55e',
    weight: 3,
    positions: [
      [33.758, -118.120], [33.762, -118.190], [33.768, -118.260],
      [33.778, -118.330], [33.800, -118.380], [33.840, -118.418],
    ] as [number, number][],
  },
  {
    label: 'I-110',
    status: 'Moderate',
    color: '#f59e0b',
    weight: 4,
    positions: [
      [33.790, -118.275], [33.825, -118.278], [33.860, -118.280],
      [33.895, -118.275], [33.930, -118.270],
    ] as [number, number][],
  },
]

// ─── Layer config ──────────────────────────────────────────────────────────────
type LayerKey = 'teams' | 'jobs' | 'routes' | 'zone' | 'traffic'

const LAYER_CONFIG: {
  key: LayerKey
  label: string
  Icon: React.FC<{ className?: string }>
  on: string
  off: string
}[] = [
  { key: 'teams',   label: 'Teams',   Icon: Users,      on: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',    off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'jobs',    label: 'Jobs',    Icon: MapPin,     on: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40', off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'routes',  label: 'Routes',  Icon: Navigation, on: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',  off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'zone',    label: 'Zone',    Icon: Radio,      on: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40', off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
  { key: 'traffic', label: 'Traffic', Icon: Car,        on: 'bg-red-500/20 text-red-300 border border-red-500/40',        off: 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]' },
]

// ─── Icon factories ────────────────────────────────────────────────────────────
function fixLeafletIcons() {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

function createCleanerIcon(cleaner: Cleaner): L.DivIcon {
  const border = getStatusColor(cleaner.status)
  return L.divIcon({
    className: '',
    html: `<div style="width:40px;height:40px;border-radius:50%;background:${cleaner.color};border:3px solid ${border};display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:11px;box-shadow:0 4px 14px rgba(0,0,0,0.35);font-family:-apple-system,sans-serif;">${cleaner.initials}</div>`,
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

// ─── Component ─────────────────────────────────────────────────────────────────
export function LiveMapView() {
  const [mounted, setMounted] = useState(false)
  const [selectedCleaner, setSelectedCleaner] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets')
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    teams: true, jobs: true, routes: true, zone: true, traffic: false,
  })

  useEffect(() => { fixLeafletIcons(); setMounted(true) }, [])
  if (!mounted) return null

  function toggle(key: LayerKey) {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
      return {
        cleaner: c,
        positions: [[c.currentLat, c.currentLng], [job.lat, job.lng]] as [number, number][],
        isDashed: c.status === 'en-route',
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const trafficCount = TRAFFIC_ROADS.filter(r => r.status === 'Heavy').length

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
      />

      <div className="relative flex-1 overflow-hidden">
        <MapContainer
          center={[33.87, -118.28]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          {/* Tile layer — swaps on map type change */}
          <TileLayer
            key={mapType}
            url={TILES[mapType]}
            attribution={mapType === 'streets'
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              : '&copy; Esri'}
            maxZoom={19}
          />

          {/* Traffic overlay */}
          {layers.traffic && TRAFFIC_ROADS.map((road, i) => (
            <Polyline
              key={`traffic-${i}`}
              positions={road.positions}
              color={road.color}
              weight={road.weight}
              opacity={0.75}
            >
              <Popup>
                <div className="p-1 min-w-[120px]">
                  <p className="font-semibold text-slate-900">{road.label}</p>
                  <p className="text-xs" style={{ color: road.color }}>{road.status} traffic</p>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Service zone */}
          {layers.zone && (
            <Circle
              center={[33.7701, -118.1937]}
              radius={24140}
              pathOptions={{
                color: '#6366f1', fillColor: '#6366f1',
                fillOpacity: 0.04, weight: 1.5, dashArray: '6 4',
              }}
            />
          )}

          {/* Route lines */}
          {layers.routes && routes.map((route, i) => (
            <Polyline
              key={`route-${i}`}
              positions={route.positions}
              color={route.cleaner.color}
              weight={3}
              opacity={0.85}
              dashArray={route.isDashed ? '8 6' : undefined}
            />
          ))}

          {/* Job markers */}
          {layers.jobs && activeJobs.map(job => (
            <Marker key={job.id} position={[job.lat, job.lng]} icon={createJobIcon(job.status)}>
              <Popup>
                <div className="min-w-[180px] p-1">
                  <p className="font-semibold text-slate-900 text-sm">{job.address.split(',')[0]}</p>
                  <p className="text-xs text-slate-500">{getServiceLabel(job.serviceType)}</p>
                  <p className="text-xs text-slate-500">{formatTime(job.scheduledTime)} · {job.estimatedDuration} min</p>
                  <p className="text-xs font-semibold text-green-600 mt-1">{formatCurrency(job.price)}</p>
                  <span style={{ display:'inline-block', marginTop:4, padding:'2px 8px', borderRadius:12, fontSize:10, background:'#e0f2fe', color:'#0369a1', textTransform:'capitalize' }}>
                    {job.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Cleaner markers */}
          {layers.teams && CLEANERS.map(cleaner => (
            <Marker
              key={cleaner.id}
              position={[cleaner.currentLat, cleaner.currentLng]}
              icon={createCleanerIcon(cleaner)}
              eventHandlers={{ click: () => setSelectedCleaner(cleaner.id) }}
            >
              <Popup>
                <div className="min-w-[160px] p-1">
                  <p className="font-semibold text-slate-900">{cleaner.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{cleaner.status.replace('-', ' ')}</p>
                  {cleaner.currentJobId && <p className="mt-1 text-xs text-blue-600">On job #{cleaner.currentJobId}</p>}
                  <p className="mt-1 text-xs text-slate-400">{cleaner.homeAreaName} · ⭐ {cleaner.rating}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ── Map type switcher — top right ───────────────────────────────── */}
        <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-lg border border-[#1e2a3a] shadow-lg">
          <button
            onClick={() => setMapType('streets')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              mapType === 'streets'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#111827]/90 text-slate-400 hover:text-white hover:bg-[#1a2537]'
            )}
          >
            <Map className="h-3.5 w-3.5" />
            Map
          </button>
          <div className="w-px bg-[#1e2a3a]" />
          <button
            onClick={() => setMapType('satellite')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              mapType === 'satellite'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#111827]/90 text-slate-400 hover:text-white hover:bg-[#1a2537]'
            )}
          >
            <Satellite className="h-3.5 w-3.5" />
            Satellite
          </button>
        </div>

        {/* ── Layer toggles — bottom center ───────────────────────────────── */}
        <div className="absolute bottom-6 left-1/2 z-[1000] -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-2xl border border-[#1e2a3a] bg-[#0d1321]/95 backdrop-blur-md px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {LAYER_CONFIG.map(({ key, label, Icon, on, off }) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150',
                  layers[key] ? on : off
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {key === 'traffic' && layers.traffic && trafficCount > 0 && (
                  <span className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {trafficCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Traffic legend — only when traffic is on ─────────────────────── */}
        {layers.traffic && (
          <div className="absolute bottom-20 left-1/2 z-[1000] -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-xl border border-[#1e2a3a] bg-[#0d1321]/95 backdrop-blur-md px-4 py-2 shadow-lg">
              {[
                { color: '#22c55e', label: 'Clear' },
                { color: '#f59e0b', label: 'Moderate' },
                { color: '#ef4444', label: 'Heavy' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="h-1 w-6 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active layers summary — top left ────────────────────────────── */}
        <div className="absolute left-3 top-3 z-[1000]">
          <div className="flex flex-wrap gap-1">
            {(Object.entries(layers) as [LayerKey, boolean][])
              .filter(([, on]) => on)
              .map(([key]) => {
                const cfg = LAYER_CONFIG.find(c => c.key === key)!
                return (
                  <div
                    key={key}
                    className="flex items-center gap-1 rounded-full bg-[#0d1321]/90 backdrop-blur border border-[#1e2a3a] px-2 py-0.5"
                  >
                    <cfg.Icon className="h-2.5 w-2.5 text-slate-400" />
                    <span className="text-[10px] text-slate-400">{cfg.label}</span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
