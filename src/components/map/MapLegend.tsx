export function MapLegend() {
  const cleanerStatuses = [
    { label: 'Available', color: '#10b981' },
    { label: 'En Route', color: '#f59e0b' },
    { label: 'Cleaning', color: '#6366f1' },
    { label: 'Off Duty', color: '#374151' },
  ]
  const jobStatuses = [
    { label: 'Scheduled', color: '#6366f1' },
    { label: 'Confirmed', color: '#10b981' },
    { label: 'In Progress', color: '#f59e0b' },
  ]

  return (
    <div className="absolute right-3 top-3 z-[1000] rounded-xl bg-[#111827]/90 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-[#1e2a3a] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Legend</p>
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-slate-400 mb-1">Cleaners</p>
        {cleanerStatuses.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-slate-400">{s.label}</span>
          </div>
        ))}
        <div className="my-1.5 h-px bg-[#1e2a3a]" />
        <p className="text-[10px] font-medium text-slate-400 mb-1">Jobs</p>
        {jobStatuses.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-md" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-slate-400">{s.label}</span>
          </div>
        ))}
        <div className="my-1.5 h-px bg-[#1e2a3a]" />
        <div className="flex items-center gap-1.5">
          <div className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: '#6366f1' }} />
          <span className="text-[10px] text-slate-400">En Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0 w-4 border-t-2" style={{ borderColor: '#6366f1' }} />
          <span className="text-[10px] text-slate-400">On Site</span>
        </div>
      </div>
    </div>
  )
}
