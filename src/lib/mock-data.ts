import { Cleaner, Customer, Job, Payment, FacebookGroup } from '@/types'

export const LA_CENTER = { lat: 33.9425, lng: -118.2 }

export const CLEANERS: Cleaner[] = []

export const CUSTOMERS: Customer[] = []

export const JOBS: Job[] = []

export const PAYMENTS: Payment[] = []

export const FACEBOOK_GROUPS: FacebookGroup[] = [
  { id: 'fg1', name: 'Long Beach Moms & Dads', memberCount: 12400, category: 'parenting', city: 'Long Beach' },
  { id: 'fg2', name: 'Long Beach Community Board', memberCount: 28900, category: 'local-community', city: 'Long Beach' },
  { id: 'fg3', name: 'South Bay Home Services', memberCount: 8700, category: 'home-services', city: 'Torrance' },
  { id: 'fg4', name: 'Torrance Neighborhood Network', memberCount: 15200, category: 'neighborhood', city: 'Torrance' },
  { id: 'fg5', name: 'Manhattan Beach Families', memberCount: 9800, category: 'parenting', city: 'Manhattan Beach' },
  { id: 'fg6', name: 'Redondo Beach Buy Sell Trade', memberCount: 22100, category: 'local-community', city: 'Redondo Beach' },
  { id: 'fg7', name: 'Hawthorne Community Hub', memberCount: 11300, category: 'neighborhood', city: 'Hawthorne' },
  { id: 'fg8', name: 'El Segundo Locals', memberCount: 6700, category: 'neighborhood', city: 'El Segundo' },
  { id: 'fg9', name: 'LA Home Improvement & Services', memberCount: 45000, category: 'home-services', city: 'Los Angeles' },
  { id: 'fg10', name: 'Compton Community Support', memberCount: 8900, category: 'local-community', city: 'Compton' },
  { id: 'fg11', name: 'Lakewood Parents Network', memberCount: 7400, category: 'parenting', city: 'Lakewood' },
  { id: 'fg12', name: 'Hermosa Beach Connections', memberCount: 13600, category: 'neighborhood', city: 'Hermosa Beach' },
  { id: 'fg13', name: 'South LA Home Owners', memberCount: 19200, category: 'home-services', city: 'Los Angeles' },
  { id: 'fg14', name: 'Carson Community Board', memberCount: 16800, category: 'local-community', city: 'Carson' },
  { id: 'fg15', name: 'Gardena Neighborhood Watch', memberCount: 9100, category: 'neighborhood', city: 'Gardena' },
  { id: 'fg16', name: 'Inglewood Families First', memberCount: 11700, category: 'parenting', city: 'Inglewood' },
  { id: 'fg17', name: 'Bellflower Home & Garden', memberCount: 8300, category: 'home-services', city: 'Bellflower' },
  { id: 'fg18', name: 'Signal Hill Community', memberCount: 5400, category: 'neighborhood', city: 'Signal Hill' },
  { id: 'fg19', name: 'Lawndale Local Services', memberCount: 7200, category: 'home-services', city: 'Lawndale' },
  { id: 'fg20', name: 'West Carson Neighbors', memberCount: 6100, category: 'neighborhood', city: 'West Carson' },
]

const today = new Date()
function fmt(d: Date) { return d.toISOString().split('T')[0] }

export function getTodayJobs(): Job[] {
  return JOBS.filter(j => j.scheduledDate === fmt(today))
}

export function getUpcomingJobs(): Job[] {
  return JOBS.filter(j => j.scheduledDate > fmt(today)).slice(0, 8)
}

export function getMonthRevenue(): number {
  return PAYMENTS.filter(p => p.month === fmt(today).slice(0, 7))
    .reduce((sum, p) => sum + p.amount, 0)
}

export function getPendingRevenue(): number {
  return JOBS.filter(j => !j.paid && j.status === 'completed')
    .reduce((sum, j) => sum + j.price, 0)
}
