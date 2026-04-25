import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#070b14]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-[#070b14]">
          {children}
        </main>
      </div>
    </div>
  )
}
