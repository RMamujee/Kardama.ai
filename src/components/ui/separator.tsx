import { cn } from '@/lib/utils'
export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div className={cn(vertical ? 'w-px bg-[#1e2a3a]' : 'h-px bg-[#1e2a3a]', className)} />
}
