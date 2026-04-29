import { DashboardShell } from '@/components/layout/DashboardShell'
import { ChatListenerProvider } from '@/components/layout/ChatListenerProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell chatListener={<ChatListenerProvider />}>
      {children}
    </DashboardShell>
  )
}
