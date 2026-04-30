import { Cleaner, Customer, Job, Payment, FacebookGroup, Team } from '@/types'

export const TEAMS: Team[] = [
  { id: 'team-a', name: 'Team Alpha',   color: '#5EEAD4', archived: false },
  { id: 'team-b', name: 'Team Beta',    color: '#34D399', archived: false },
  { id: 'team-c', name: 'Team Gamma',   color: '#FBBF24', archived: false },
  { id: 'team-d', name: 'Team Delta',   color: '#60A5FA', archived: false },
  { id: 'team-e', name: 'Team Epsilon', color: '#A78BFA', archived: false },
]

export const LA_CENTER = { lat: 33.9425, lng: -118.2 }

const today = new Date()
function fmt(d: Date) { return d.toISOString().split('T')[0] }
function ago(days: number): string { const d = new Date(today); d.setDate(d.getDate() - days); return fmt(d) }
function ahead(days: number): string { const d = new Date(today); d.setDate(d.getDate() + days); return fmt(d) }
function monthOf(dateStr: string): string { return dateStr.slice(0, 7) }

// Covers all slot times (08:00–14:00 + 150 min duration = ends by 16:30)
const HOURS_FULL: Cleaner['availableHours'] = {
  Sun: null,
  Mon: { start: '07:30', end: '17:30' },
  Tue: { start: '07:30', end: '17:30' },
  Wed: { start: '07:30', end: '17:30' },
  Thu: { start: '07:30', end: '17:30' },
  Fri: { start: '07:30', end: '17:30' },
  Sat: { start: '07:30', end: '17:30' },
}

const HOURS_WEEKDAY: Cleaner['availableHours'] = {
  Sun: null,
  Mon: { start: '09:00', end: '17:00' },
  Tue: { start: '09:00', end: '17:00' },
  Wed: { start: '09:00', end: '17:00' },
  Thu: { start: '09:00', end: '17:00' },
  Fri: { start: '09:00', end: '17:00' },
  Sat: null,
}

// ─── Cleaners ─────────────────────────────────────────────────────────────────
// IDs c1–c10 must match TEAMS map in campaign-engine.ts:
// team-a:[c1,c2]  team-b:[c3,c4]  team-c:[c5,c6]  team-d:[c7,c8]  team-e:[c9,c10]
export const CLEANERS: Cleaner[] = [
  {
    id: 'c1', name: 'Maria Gonzalez', initials: 'MG',
    phone: '(310) 555-0101', email: 'maria@kardama.ai',
    rating: 4.9, totalJobs: 187,
    currentLat: 33.849, currentLng: -118.388,
    homeAreaName: 'Redondo Beach', homeAreaLat: 33.849, homeAreaLng: -118.388,
    status: 'available', availableHours: HOURS_FULL,
    specialties: ['standard', 'deep-clean'], reliabilityScore: 98,
    currentJobId: null, teamId: 'team-a', color: '#5EEAD4',
  },
  {
    id: 'c2', name: 'Sofia Rodriguez', initials: 'SR',
    phone: '(310) 555-0102', email: 'sofia@kardama.ai',
    rating: 4.8, totalJobs: 143,
    currentLat: 33.853, currentLng: -118.384,
    homeAreaName: 'Redondo Beach', homeAreaLat: 33.852, homeAreaLng: -118.384,
    status: 'available', availableHours: HOURS_FULL,
    specialties: ['standard', 'airbnb'], reliabilityScore: 96,
    currentJobId: null, teamId: 'team-a', color: '#34D399',
  },
  {
    id: 'c3', name: 'Carlos Mendez', initials: 'CM',
    phone: '(562) 555-0103', email: 'carlos@kardama.ai',
    rating: 4.7, totalJobs: 112,
    currentLat: 33.770, currentLng: -118.193,
    homeAreaName: 'Long Beach', homeAreaLat: 33.770, homeAreaLng: -118.193,
    status: 'en-route', availableHours: HOURS_FULL,
    specialties: ['standard', 'move-out'], reliabilityScore: 94,
    currentJobId: null, teamId: 'team-b', color: '#F472B6',
  },
  {
    id: 'c4', name: 'Ana Torres', initials: 'AT',
    phone: '(562) 555-0104', email: 'ana@kardama.ai',
    rating: 4.9, totalJobs: 156,
    currentLat: 33.773, currentLng: -118.197,
    homeAreaName: 'Long Beach', homeAreaLat: 33.773, homeAreaLng: -118.197,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['deep-clean', 'post-construction'], reliabilityScore: 97,
    currentJobId: null, teamId: 'team-b', color: '#60A5FA',
  },
  {
    id: 'c5', name: 'Luis Herrera', initials: 'LH',
    phone: '(310) 555-0105', email: 'luis@kardama.ai',
    rating: 4.6, totalJobs: 89,
    currentLat: 33.836, currentLng: -118.340,
    homeAreaName: 'Torrance', homeAreaLat: 33.836, homeAreaLng: -118.340,
    status: 'available', availableHours: HOURS_FULL,
    specialties: ['standard', 'deep-clean'], reliabilityScore: 92,
    currentJobId: null, teamId: 'team-c', color: '#FBBF24',
  },
  {
    id: 'c6', name: 'Isabella Cruz', initials: 'IC',
    phone: '(310) 555-0106', email: 'isabella@kardama.ai',
    rating: 4.8, totalJobs: 121,
    currentLat: 33.839, currentLng: -118.337,
    homeAreaName: 'Torrance', homeAreaLat: 33.839, homeAreaLng: -118.337,
    status: 'available', availableHours: HOURS_FULL,
    specialties: ['airbnb', 'standard'], reliabilityScore: 95,
    currentJobId: null, teamId: 'team-c', color: '#A78BFA',
  },
  {
    id: 'c7', name: 'Elena Ramos', initials: 'ER',
    phone: '(310) 555-0107', email: 'elena@kardama.ai',
    rating: 4.7, totalJobs: 98,
    currentLat: 33.916, currentLng: -118.352,
    homeAreaName: 'Hawthorne', homeAreaLat: 33.916, homeAreaLng: -118.352,
    status: 'available', availableHours: HOURS_FULL,
    specialties: ['standard', 'deep-clean'], reliabilityScore: 93,
    currentJobId: null, teamId: 'team-d', color: '#2DD4BF',
  },
  {
    id: 'c8', name: 'Miguel Vega', initials: 'MV',
    phone: '(310) 555-0108', email: 'miguel@kardama.ai',
    rating: 4.5, totalJobs: 74,
    currentLat: 33.913, currentLng: -118.355,
    homeAreaName: 'Hawthorne', homeAreaLat: 33.913, homeAreaLng: -118.355,
    status: 'off-duty', availableHours: HOURS_WEEKDAY,
    specialties: ['move-out', 'post-construction'], reliabilityScore: 88,
    currentJobId: null, teamId: 'team-d', color: '#F87171',
  },
  {
    id: 'c9', name: 'Diana Flores', initials: 'DF',
    phone: '(310) 555-0109', email: 'diana@kardama.ai',
    rating: 4.8, totalJobs: 134,
    currentLat: 33.831, currentLng: -118.282,
    homeAreaName: 'Carson', homeAreaLat: 33.831, homeAreaLng: -118.282,
    status: 'available', availableHours: HOURS_FULL,
    specialties: ['standard', 'airbnb'], reliabilityScore: 96,
    currentJobId: null, teamId: 'team-e', color: '#22D3EE',
  },
  {
    id: 'c10', name: 'Roberto Castro', initials: 'RC',
    phone: '(310) 555-0110', email: 'roberto@kardama.ai',
    rating: 4.6, totalJobs: 88,
    currentLat: 33.828, currentLng: -118.286,
    homeAreaName: 'Carson', homeAreaLat: 33.828, homeAreaLng: -118.286,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['deep-clean', 'standard'], reliabilityScore: 91,
    currentJobId: null, teamId: 'team-e', color: '#06b6d4',
  },
]

// ─── Customers ────────────────────────────────────────────────────────────────
// Last-job age → campaign outcome:
//  cust-001: 20d → pending (three-week-followup)
//  cust-002: 24d → pending (three-week-followup)
//  cust-003: 26d → pending (three-week-followup)
//  cust-004: 31d → pending (inactive-30d)
//  cust-005: 35d → pending (inactive-30d)
//  cust-006: 40d → pending (inactive-30d)
//  cust-007: 48d → expired
//  cust-008: 60d → expired
//  cust-009 to cust-015: <18d → no campaign
export const CUSTOMERS: Customer[] = [
  {
    id: 'cust-001', name: 'Jennifer Walsh',
    phone: '(310) 555-1001', email: 'jennifer.walsh@email.com',
    address: '1425 Pine Ave, Manhattan Beach, CA 90266',
    lat: 33.886, lng: -118.411, city: 'Manhattan Beach',
    preferredCleanerIds: ['c1', 'c2'],
    jobHistory: ['job-016', 'job-001', 'job-027'],
    source: 'referral', notes: 'Has 2 dogs. Pet-safe products only.',
    totalSpent: 1240, createdAt: ago(180),
  },
  {
    id: 'cust-002', name: 'Michael Chen',
    phone: '(310) 555-1002', email: 'm.chen@email.com',
    address: '2301 Crenshaw Blvd, Torrance, CA 90501',
    lat: 33.834, lng: -118.328, city: 'Torrance',
    preferredCleanerIds: ['c3', 'c4'],
    jobHistory: ['job-017', 'job-002'],
    source: 'yelp', notes: 'Prefers afternoon slots.',
    totalSpent: 1085, createdAt: ago(210),
  },
  {
    id: 'cust-003', name: 'Sarah Patel',
    phone: '(562) 555-1003', email: 'sarah.patel@email.com',
    address: '880 E Ocean Blvd, Long Beach, CA 90802',
    lat: 33.769, lng: -118.190, city: 'Long Beach',
    preferredCleanerIds: ['c5', 'c6'],
    jobHistory: ['job-003', 'job-029'],
    source: 'facebook', notes: 'Condo on 4th floor. Elevator access.',
    totalSpent: 700, createdAt: ago(90),
  },
  {
    id: 'cust-004', name: 'David Martinez',
    phone: '(310) 555-1004', email: 'david.martinez@email.com',
    address: '3204 Grant Ave, Redondo Beach, CA 90278',
    lat: 33.861, lng: -118.375, city: 'Redondo Beach',
    preferredCleanerIds: ['c1', 'c2'],
    jobHistory: ['job-018', 'job-004', 'job-028'],
    source: 'referral', notes: 'Monthly deep clean. Key in lockbox #7.',
    totalSpent: 1440, createdAt: ago(240),
  },
  {
    id: 'cust-005', name: 'Ashley Johnson',
    phone: '(310) 555-1005', email: 'ashley.j@email.com',
    address: '1512 Hermosa Ave, Hermosa Beach, CA 90254',
    lat: 33.862, lng: -118.399, city: 'Hermosa Beach',
    preferredCleanerIds: ['c3', 'c4'],
    jobHistory: ['job-005'],
    source: 'text', notes: 'Beach house — sand everywhere. Bring extra supplies.',
    totalSpent: 295, createdAt: ago(70),
  },
  {
    id: 'cust-006', name: 'Robert Kim',
    phone: '(310) 555-1006', email: 'r.kim@email.com',
    address: '610 Main St, El Segundo, CA 90245',
    lat: 33.919, lng: -118.416, city: 'El Segundo',
    preferredCleanerIds: ['c5', 'c6'],
    jobHistory: ['job-006'],
    source: 'yelp', notes: 'Prefers eco-friendly products.',
    totalSpent: 380, createdAt: ago(120),
  },
  {
    id: 'cust-007', name: 'Linda Thompson',
    phone: '(310) 555-1007', email: 'linda.t@email.com',
    address: '4821 W El Segundo Blvd, Hawthorne, CA 90250',
    lat: 33.920, lng: -118.350, city: 'Hawthorne',
    preferredCleanerIds: ['c7', 'c8'],
    jobHistory: ['job-007'],
    source: 'referral', notes: '',
    totalSpent: 270, createdAt: ago(90),
  },
  {
    id: 'cust-008', name: 'James Rivera',
    phone: '(310) 555-1008', email: 'james.r@email.com',
    address: '1100 W Redondo Beach Blvd, Gardena, CA 90247',
    lat: 33.888, lng: -118.309, city: 'Gardena',
    preferredCleanerIds: ['c9', 'c10'],
    jobHistory: ['job-008'],
    source: 'facebook', notes: 'Move-out clean. Very large house.',
    totalSpent: 480, createdAt: ago(100),
  },
  {
    id: 'cust-009', name: 'Patricia Nguyen',
    phone: '(310) 555-1009', email: 'patricia.n@email.com',
    address: '245 E Carson St, Carson, CA 90745',
    lat: 33.831, lng: -118.282, city: 'Carson',
    preferredCleanerIds: ['c9', 'c10'],
    jobHistory: ['job-019', 'job-009', 'job-023'],
    source: 'repeat', notes: 'Biweekly regular. Very tidy home.',
    totalSpent: 1500, createdAt: ago(160),
  },
  {
    id: 'cust-010', name: 'Thomas Wilson',
    phone: '(310) 555-1010', email: 't.wilson@email.com',
    address: '4317 Inglewood Ave, Lawndale, CA 90260',
    lat: 33.887, lng: -118.352, city: 'Lawndale',
    preferredCleanerIds: ['c3', 'c4'],
    jobHistory: ['job-020', 'job-010', 'job-024'],
    source: 'yelp', notes: 'Has a cat. Focus on baseboards.',
    totalSpent: 1375, createdAt: ago(200),
  },
  {
    id: 'cust-011', name: 'Michelle Brown',
    phone: '(562) 555-1011', email: 'michelle.b@email.com',
    address: '2020 Orange Ave, Signal Hill, CA 90755',
    lat: 33.803, lng: -118.183, city: 'Signal Hill',
    preferredCleanerIds: ['c5', 'c6'],
    jobHistory: ['job-021', 'job-011', 'job-026'],
    source: 'referral', notes: 'Works from home. Use quiet equipment.',
    totalSpent: 1360, createdAt: ago(220),
  },
  {
    id: 'cust-012', name: 'Christopher Davis',
    phone: '(310) 555-1012', email: 'chris.d@email.com',
    address: '3310 W Century Blvd, Inglewood, CA 90303',
    lat: 33.955, lng: -118.368, city: 'Inglewood',
    preferredCleanerIds: ['c7', 'c8'],
    jobHistory: ['job-012'],
    source: 'facebook', notes: 'Airport-adjacent. Flexible scheduling.',
    totalSpent: 265, createdAt: ago(60),
  },
  {
    id: 'cust-013', name: 'Amanda Garcia',
    phone: '(310) 555-1013', email: 'amanda.g@email.com',
    address: '600 N Willowbrook Ave, Compton, CA 90222',
    lat: 33.896, lng: -118.220, city: 'Compton',
    preferredCleanerIds: ['c9', 'c10'],
    jobHistory: ['job-013'],
    source: 'text', notes: '3-bed house. Small kids home in PM.',
    totalSpent: 290, createdAt: ago(80),
  },
  {
    id: 'cust-014', name: 'Kevin Lee',
    phone: '(310) 555-1014', email: 'kevin.l@email.com',
    address: '1850 Avalon Blvd, West Carson, CA 90746',
    lat: 33.831, lng: -118.296, city: 'West Carson',
    preferredCleanerIds: ['c9', 'c10'],
    jobHistory: ['job-014'],
    source: 'yelp', notes: 'Post-reno clean.',
    totalSpent: 255, createdAt: ago(95),
  },
  {
    id: 'cust-015', name: 'Stephanie Taylor',
    phone: '(562) 555-1015', email: 'steph.t@email.com',
    address: '4500 Clark Ave, Lakewood, CA 90712',
    lat: 33.853, lng: -118.132, city: 'Lakewood',
    preferredCleanerIds: ['c9', 'c10'],
    jobHistory: ['job-022', 'job-015', 'job-025', 'job-030'],
    source: 'referral', notes: 'Airbnb host. Turnaround cleans.',
    totalSpent: 1240, createdAt: ago(190),
  },
]

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const JOBS: Job[] = [
  // ── Completed jobs that trigger campaign detection ──────────────────────────
  {
    id: 'job-001', customerId: 'cust-001', cleanerIds: ['c1', 'c2'],
    scheduledDate: ago(20), scheduledTime: '09:00', estimatedDuration: 150, actualDuration: 155,
    status: 'completed', serviceType: 'standard', price: 280, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-001',
    address: '1425 Pine Ave, Manhattan Beach, CA 90266',
    lat: 33.886, lng: -118.411, notes: '', driveTimeMinutes: 12, createdAt: ago(25),
  },
  {
    id: 'job-002', customerId: 'cust-002', cleanerIds: ['c3', 'c4'],
    scheduledDate: ago(24), scheduledTime: '10:00', estimatedDuration: 150, actualDuration: 148,
    status: 'completed', serviceType: 'standard', price: 260, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-002',
    address: '2301 Crenshaw Blvd, Torrance, CA 90501',
    lat: 33.834, lng: -118.328, notes: '', driveTimeMinutes: 18, createdAt: ago(30),
  },
  {
    id: 'job-003', customerId: 'cust-003', cleanerIds: ['c5', 'c6'],
    scheduledDate: ago(26), scheduledTime: '08:00', estimatedDuration: 180, actualDuration: 185,
    status: 'completed', serviceType: 'deep', price: 350, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-003',
    address: '880 E Ocean Blvd, Long Beach, CA 90802',
    lat: 33.769, lng: -118.190, notes: 'Condo deep clean', driveTimeMinutes: 22, createdAt: ago(31),
  },
  {
    id: 'job-004', customerId: 'cust-004', cleanerIds: ['c1', 'c2'],
    scheduledDate: ago(31), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 240, paid: true,
    paymentMethod: 'cash',
    address: '3204 Grant Ave, Redondo Beach, CA 90278',
    lat: 33.861, lng: -118.375, notes: '', driveTimeMinutes: 8, createdAt: ago(35),
  },
  {
    id: 'job-005', customerId: 'cust-005', cleanerIds: ['c3', 'c4'],
    scheduledDate: ago(35), scheduledTime: '11:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 295, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-005',
    address: '1512 Hermosa Ave, Hermosa Beach, CA 90254',
    lat: 33.862, lng: -118.399, notes: 'Beach sand in every corner', driveTimeMinutes: 28, createdAt: ago(40),
  },
  {
    id: 'job-006', customerId: 'cust-006', cleanerIds: ['c5', 'c6'],
    scheduledDate: ago(40), scheduledTime: '10:00', estimatedDuration: 180,
    status: 'completed', serviceType: 'deep', price: 380, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-006',
    address: '610 Main St, El Segundo, CA 90245',
    lat: 33.919, lng: -118.416, notes: 'Eco products requested', driveTimeMinutes: 35, createdAt: ago(45),
  },
  {
    id: 'job-007', customerId: 'cust-007', cleanerIds: ['c7', 'c8'],
    scheduledDate: ago(48), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 270, paid: true,
    paymentMethod: 'cash',
    address: '4821 W El Segundo Blvd, Hawthorne, CA 90250',
    lat: 33.920, lng: -118.350, notes: '', driveTimeMinutes: 10, createdAt: ago(52),
  },
  {
    id: 'job-008', customerId: 'cust-008', cleanerIds: ['c9', 'c10'],
    scheduledDate: ago(60), scheduledTime: '08:00', estimatedDuration: 300, actualDuration: 320,
    status: 'completed', serviceType: 'move-out', price: 480, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-008',
    address: '1100 W Redondo Beach Blvd, Gardena, CA 90247',
    lat: 33.888, lng: -118.309, notes: 'Move-out, 4bd/2ba', driveTimeMinutes: 20, createdAt: ago(65),
  },
  {
    id: 'job-012', customerId: 'cust-012', cleanerIds: ['c7', 'c8'],
    scheduledDate: ago(19), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 265, paid: true,
    paymentMethod: 'cash',
    address: '3310 W Century Blvd, Inglewood, CA 90303',
    lat: 33.955, lng: -118.368, notes: '', driveTimeMinutes: 12, createdAt: ago(22),
  },
  {
    id: 'job-013', customerId: 'cust-013', cleanerIds: ['c9', 'c10'],
    scheduledDate: ago(28), scheduledTime: '10:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 290, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-013',
    address: '600 N Willowbrook Ave, Compton, CA 90222',
    lat: 33.896, lng: -118.220, notes: '3-bed house', driveTimeMinutes: 18, createdAt: ago(32),
  },
  {
    id: 'job-014', customerId: 'cust-014', cleanerIds: ['c9', 'c10'],
    scheduledDate: ago(42), scheduledTime: '08:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 255, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-014',
    address: '1850 Avalon Blvd, West Carson, CA 90746',
    lat: 33.831, lng: -118.296, notes: 'Post-renovation clean', driveTimeMinutes: 10, createdAt: ago(46),
  },

  // ── Recent completed jobs (no campaign — < 18 days) ─────────────────────────
  {
    id: 'job-009', customerId: 'cust-009', cleanerIds: ['c9', 'c10'],
    scheduledDate: ago(5), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 250, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-009',
    address: '245 E Carson St, Carson, CA 90745',
    lat: 33.831, lng: -118.282, notes: '', driveTimeMinutes: 5, createdAt: ago(7),
  },
  {
    id: 'job-010', customerId: 'cust-010', cleanerIds: ['c3', 'c4'],
    scheduledDate: ago(10), scheduledTime: '10:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 275, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-010',
    address: '4317 Inglewood Ave, Lawndale, CA 90260',
    lat: 33.887, lng: -118.352, notes: 'Focus on baseboards', driveTimeMinutes: 15, createdAt: ago(12),
  },
  {
    id: 'job-011', customerId: 'cust-011', cleanerIds: ['c5', 'c6'],
    scheduledDate: ago(15), scheduledTime: '11:00', estimatedDuration: 180,
    status: 'completed', serviceType: 'deep', price: 340, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-011',
    address: '2020 Orange Ave, Signal Hill, CA 90755',
    lat: 33.803, lng: -118.183, notes: 'Quiet equipment', driveTimeMinutes: 25, createdAt: ago(18),
  },
  {
    id: 'job-015', customerId: 'cust-015', cleanerIds: ['c9', 'c10'],
    scheduledDate: ago(3), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'airbnb', price: 310, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-015',
    address: '4500 Clark Ave, Lakewood, CA 90712',
    lat: 33.853, lng: -118.132, notes: 'Guest checked out at 11am', driveTimeMinutes: 30, createdAt: ago(5),
  },

  // ── Older historical completed jobs ─────────────────────────────────────────
  {
    id: 'job-016', customerId: 'cust-001', cleanerIds: ['c1', 'c2'],
    scheduledDate: ago(55), scheduledTime: '10:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 260, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-016',
    address: '1425 Pine Ave, Manhattan Beach, CA 90266',
    lat: 33.886, lng: -118.411, notes: '', driveTimeMinutes: 12, createdAt: ago(60),
  },
  {
    id: 'job-017', customerId: 'cust-002', cleanerIds: ['c3', 'c4'],
    scheduledDate: ago(65), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 245, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-017',
    address: '2301 Crenshaw Blvd, Torrance, CA 90501',
    lat: 33.834, lng: -118.328, notes: '', driveTimeMinutes: 18, createdAt: ago(70),
  },
  {
    id: 'job-018', customerId: 'cust-004', cleanerIds: ['c1', 'c2'],
    scheduledDate: ago(70), scheduledTime: '09:00', estimatedDuration: 180,
    status: 'completed', serviceType: 'deep', price: 360, paid: true,
    paymentMethod: 'cash',
    address: '3204 Grant Ave, Redondo Beach, CA 90278',
    lat: 33.861, lng: -118.375, notes: '', driveTimeMinutes: 8, createdAt: ago(74),
  },
  {
    id: 'job-019', customerId: 'cust-009', cleanerIds: ['c9', 'c10'],
    scheduledDate: ago(22), scheduledTime: '10:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 250, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-019',
    address: '245 E Carson St, Carson, CA 90745',
    lat: 33.831, lng: -118.282, notes: '', driveTimeMinutes: 5, createdAt: ago(25),
  },
  {
    id: 'job-020', customerId: 'cust-010', cleanerIds: ['c3', 'c4'],
    scheduledDate: ago(45), scheduledTime: '11:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 275, paid: true,
    paymentMethod: 'zelle', paymentConfirmationId: 'zel-020',
    address: '4317 Inglewood Ave, Lawndale, CA 90260',
    lat: 33.887, lng: -118.352, notes: '', driveTimeMinutes: 15, createdAt: ago(48),
  },
  {
    id: 'job-021', customerId: 'cust-011', cleanerIds: ['c5', 'c6'],
    scheduledDate: ago(50), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 340, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-021',
    address: '2020 Orange Ave, Signal Hill, CA 90755',
    lat: 33.803, lng: -118.183, notes: '', driveTimeMinutes: 25, createdAt: ago(53),
  },
  {
    id: 'job-022', customerId: 'cust-015', cleanerIds: ['c9', 'c10'],
    scheduledDate: ago(18), scheduledTime: '10:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'airbnb', price: 310, paid: true,
    paymentMethod: 'venmo', paymentConfirmationId: 'vnm-022',
    address: '4500 Clark Ave, Lakewood, CA 90712',
    lat: 33.853, lng: -118.132, notes: '', driveTimeMinutes: 30, createdAt: ago(20),
  },

  // ── Today's active jobs ──────────────────────────────────────────────────────
  {
    id: 'job-023', customerId: 'cust-009', cleanerIds: ['c9', 'c10'],
    scheduledDate: fmt(today), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'confirmed', serviceType: 'standard', price: 250, paid: false,
    address: '245 E Carson St, Carson, CA 90745',
    lat: 33.831, lng: -118.282, notes: 'Biweekly regular', driveTimeMinutes: 5, createdAt: ago(3),
  },
  {
    id: 'job-024', customerId: 'cust-010', cleanerIds: ['c3', 'c4'],
    scheduledDate: fmt(today), scheduledTime: '11:00', estimatedDuration: 150,
    status: 'in-progress', serviceType: 'standard', price: 275, paid: false,
    address: '4317 Inglewood Ave, Lawndale, CA 90260',
    lat: 33.887, lng: -118.352, notes: '', driveTimeMinutes: 15, createdAt: ago(4),
  },
  {
    id: 'job-025', customerId: 'cust-015', cleanerIds: ['c9', 'c10'],
    scheduledDate: fmt(today), scheduledTime: '14:00', estimatedDuration: 150,
    status: 'scheduled', serviceType: 'airbnb', price: 310, paid: false,
    address: '4500 Clark Ave, Lakewood, CA 90712',
    lat: 33.853, lng: -118.132, notes: 'Guest checkout 12pm', driveTimeMinutes: 30, createdAt: ago(2),
  },

  // ── Upcoming scheduled jobs ──────────────────────────────────────────────────
  {
    id: 'job-026', customerId: 'cust-011', cleanerIds: ['c5', 'c6'],
    scheduledDate: ahead(2), scheduledTime: '09:00', estimatedDuration: 180,
    status: 'scheduled', serviceType: 'deep', price: 340, paid: false,
    address: '2020 Orange Ave, Signal Hill, CA 90755',
    lat: 33.803, lng: -118.183, notes: '', driveTimeMinutes: 25, createdAt: ago(1),
  },
  {
    id: 'job-027', customerId: 'cust-001', cleanerIds: ['c1', 'c2'],
    scheduledDate: ahead(3), scheduledTime: '10:00', estimatedDuration: 150,
    status: 'scheduled', serviceType: 'standard', price: 280, paid: false,
    address: '1425 Pine Ave, Manhattan Beach, CA 90266',
    lat: 33.886, lng: -118.411, notes: 'Dogs will be in backyard', driveTimeMinutes: 12, createdAt: ago(1),
  },
  {
    id: 'job-028', customerId: 'cust-004', cleanerIds: ['c1', 'c2'],
    scheduledDate: ahead(5), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'scheduled', serviceType: 'standard', price: 240, paid: false,
    address: '3204 Grant Ave, Redondo Beach, CA 90278',
    lat: 33.861, lng: -118.375, notes: '', driveTimeMinutes: 8, createdAt: ago(1),
  },
  {
    id: 'job-029', customerId: 'cust-003', cleanerIds: ['c5', 'c6'],
    scheduledDate: ahead(7), scheduledTime: '11:00', estimatedDuration: 180,
    status: 'scheduled', serviceType: 'deep', price: 350, paid: false,
    address: '880 E Ocean Blvd, Long Beach, CA 90802',
    lat: 33.769, lng: -118.190, notes: '', driveTimeMinutes: 22, createdAt: ago(1),
  },
  {
    id: 'job-030', customerId: 'cust-015', cleanerIds: ['c9', 'c10'],
    scheduledDate: ahead(10), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'scheduled', serviceType: 'airbnb', price: 310, paid: false,
    address: '4500 Clark Ave, Lakewood, CA 90712',
    lat: 33.853, lng: -118.132, notes: 'Weekend guest checkout', driveTimeMinutes: 30, createdAt: fmt(today),
  },
]

// ─── Payments ─────────────────────────────────────────────────────────────────
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
