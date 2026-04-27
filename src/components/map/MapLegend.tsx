export function MapLegend() {
  const cleanerStatuses = [
    { label: 'Available', cls: 'bg-emerald-500' },
    { label: 'En Route',  cls: 'bg-amber-500' },
    { label: 'Cleaning',  cls: 'bg-violet-500' },
    { label: 'Off Duty',  cls: 'bg-ink-200' },
  ]
  const jobStatuses = [
    { label: 'Scheduled',   cls: 'bg-violet-500' },
    { label: 'Confirmed',   cls: 'bg-emerald-500' },
    { label: 'In Progress', cls: 'bg-amber-500' },
  ]

  return (
    <div className="absolute right-3 top-3 z-[1000] rounded-[14px] bg-card/90 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-ink-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-2">Legend</p>
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-ink-400 mb-1">Cleaners</p>
        {cleanerStatuses.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${s.cls}`} />
            <span className="text-[11px] text-ink-400">{s.label}</span>
          </div>
        ))}
        <div className="my-1.5 h-px bg-ink-200" />
        <p className="text-[11px] font-medium text-ink-400 mb-1">Jobs</p>
        {jobStatuses.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-md ${s.cls}`} />
            <span className="text-[11px] text-ink-400">{s.label}</span>
          </div>
        ))}
        <div className="my-1.5 h-px bg-ink-200" />
        <div className="flex items-center gap-1.5">
          <div className="h-0 w-4 border-t-2 border-dashed border-violet-500" />
          <span className="text-[11px] text-ink-400">En Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0 w-4 border-t-2 border-violet-500" />
          <span className="text-[11px] text-ink-400">On Site</span>
        </div>
      </div>
    </div>
  )
}
