'use client'
import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CLEANERS, JOBS } from '@/lib/mock-data'
import { Cleaner, Job } from '@/types'
import { getStatusColor, getServiceLabel, formatTime, formatCurrency } from '@/lib/utils'
import { MapSidebar } from './MapSidebar'
import { MapLegend } from './MapLegend'

// Fix Leaflet icon issue in Next.js
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
  const statusColor = getStatusColor(cleaner.status)
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 40px; height: 40px; border-radius: 50%;
        background: ${cleaner.color};
        border: 3px solid ${statusColor};
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; color: white; font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">${cleaner.initials}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  })
}

function createJobIcon(status: string): L.DivIcon {
  const colors: Record<string, string> = {
    scheduled: '#3b82f6', confirmed: '#22c55e', 'in-progress': '#f59e0b',
    completed: '#94a3b8', cancelled: '#ef4444'
  }
  const color = colors[status] || '#3b82f6'
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px; height: 28px; border-radius: 6px;
        background: ${color};
        border: 2px solid white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

export function LiveMapView() {
  const [mounted, setMounted] = useState(false)
  const [selectedCleaner, setSelectedCleaner] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fixLeafletIcons()
    setMounted(true)
  }, [])

  if (!mounted) return null

  const activeJobs = JOBS.filter(j => {
    if (!showCompleted && j.status === 'completed') return false
    if (filterStatus !== 'all' && j.status !== filterStatus) return false
    return true
  })

  // Build routes: cleaner → their current job
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

  return (
    <div className="flex h-full">
      {/* Sidebar */}
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

      {/* Map */}
      <div className="relative flex-1">
        <MapContainer
          center={[33.87, -118.28]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Cleaner Markers */}
          {CLEANERS.map(cleaner => (
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
                  {cleaner.currentJobId && (
                    <p className="mt-1 text-xs text-blue-600">On job #{cleaner.currentJobId}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">{cleaner.homeAreaName} · ⭐ {cleaner.rating}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Job Markers */}
          {activeJobs.map(job => (
            <Marker
              key={job.id}
              position={[job.lat, job.lng]}
              icon={createJobIcon(job.status)}
            >
              <Popup>
                <div className="min-w-[180px] p-1">
                  <p className="font-semibold text-slate-900 text-sm">{job.address.split(',')[0]}</p>
                  <p className="text-xs text-slate-500">{getServiceLabel(job.serviceType)}</p>
                  <p className="text-xs text-slate-500">{formatTime(job.scheduledTime)} · {job.estimatedDuration} min</p>
                  <p className="text-xs font-semibold text-green-600 mt-1">{formatCurrency(job.price)}</p>
                  <span style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 10,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    textTransform: 'capitalize',
                  }}>{job.status}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Service radius: 15-mile circle around Long Beach */}
          <Circle
            center={[33.7701, -118.1937]}
            radius={24140}
            pathOptions={{
              color: '#6366f1',
              fillColor: '#6366f1',
              fillOpacity: 0.04,
              weight: 1.5,
              dashArray: '6 4',
            }}
          />

          {/* Route Lines */}
          {routes.map((route, i) => (
            <Polyline
              key={i}
              positions={route.positions}
              color={route.cleaner.color}
              weight={3}
              opacity={0.8}
              dashArray={route.isDashed ? '8 6' : undefined}
            />
          ))}
        </MapContainer>

        {/* Legend overlay */}
        <MapLegend />
      </div>
    </div>
  )
}
