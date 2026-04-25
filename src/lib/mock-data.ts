import { Cleaner, Customer, Job, Payment, FacebookGroup } from '@/types'

// LA area coordinates
export const LA_CENTER = { lat: 33.9425, lng: -118.2 }

const HOURS_FULL = { Mon: { start: '08:00', end: '16:00' }, Tue: { start: '08:00', end: '16:00' }, Wed: { start: '08:00', end: '16:00' }, Thu: { start: '08:00', end: '16:00' }, Fri: { start: '08:00', end: '16:00' }, Sat: null, Sun: null }

export const CLEANERS: Cleaner[] = [
  // ── Team Alpha — Long Beach ───────────────────────────────────────────────────
  {
    id: 'c1', name: 'Maria Santos', initials: 'MS', phone: '(562) 555-0101',
    email: 'maria@example.com', rating: 4.9, totalJobs: 287,
    currentLat: 33.772, currentLng: -118.193,
    homeAreaName: 'Long Beach', homeAreaLat: 33.772, homeAreaLng: -118.193,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['standard', 'deep-clean', 'airbnb'], reliabilityScore: 96,
    currentJobId: 'j1', teamId: 'team-a', color: '#3b82f6',
  },
  {
    id: 'c2', name: 'Carlos Rivera', initials: 'CR', phone: '(562) 555-0102',
    email: 'carlos@example.com', rating: 4.8, totalJobs: 241,
    currentLat: 33.786, currentLng: -118.175,
    homeAreaName: 'Long Beach', homeAreaLat: 33.786, homeAreaLng: -118.175,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['standard', 'deep-clean'], reliabilityScore: 92,
    currentJobId: 'j1', teamId: 'team-a', color: '#3b82f6',
  },
  // ── Team Beta — Torrance / South Bay ─────────────────────────────────────────
  {
    id: 'c3', name: 'Jennifer Kim', initials: 'JK', phone: '(310) 555-0103',
    email: 'jennifer@example.com', rating: 4.9, totalJobs: 312,
    currentLat: 33.835, currentLng: -118.340,
    homeAreaName: 'Torrance', homeAreaLat: 33.835, homeAreaLng: -118.340,
    status: 'en-route', availableHours: HOURS_FULL,
    specialties: ['standard', 'move-out', 'deep-clean'], reliabilityScore: 98,
    currentJobId: 'j3', teamId: 'team-b', color: '#22c55e',
  },
  {
    id: 'c4', name: 'David Park', initials: 'DP', phone: '(310) 555-0104',
    email: 'david.p@example.com', rating: 4.7, totalJobs: 198,
    currentLat: 33.841, currentLng: -118.334,
    homeAreaName: 'Torrance', homeAreaLat: 33.841, homeAreaLng: -118.334,
    status: 'en-route', availableHours: HOURS_FULL,
    specialties: ['standard', 'post-construction'], reliabilityScore: 88,
    currentJobId: 'j3', teamId: 'team-b', color: '#22c55e',
  },
  // ── Team Gamma — Compton / Gardena ────────────────────────────────────────────
  {
    id: 'c5', name: 'Rosa Martinez', initials: 'RM', phone: '(323) 555-0105',
    email: 'rosa@example.com', rating: 4.8, totalJobs: 156,
    currentLat: 33.892, currentLng: -118.220,
    homeAreaName: 'Compton', homeAreaLat: 33.892, homeAreaLng: -118.220,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['standard', 'airbnb'], reliabilityScore: 91,
    currentJobId: 'j16', teamId: 'team-c', color: '#f59e0b',
  },
  {
    id: 'c6', name: 'Miguel Torres', initials: 'MT', phone: '(323) 555-0106',
    email: 'miguel@example.com', rating: 4.6, totalJobs: 134,
    currentLat: 33.899, currentLng: -118.214,
    homeAreaName: 'Compton', homeAreaLat: 33.899, homeAreaLng: -118.214,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['standard', 'deep-clean'], reliabilityScore: 85,
    currentJobId: 'j16', teamId: 'team-c', color: '#f59e0b',
  },
  // ── Team Delta — El Segundo / Hawthorne ──────────────────────────────────────
  {
    id: 'c7', name: 'Ashley Johnson', initials: 'AJ', phone: '(310) 555-0107',
    email: 'ashley@example.com', rating: 4.9, totalJobs: 267,
    currentLat: 33.916, currentLng: -118.416,
    homeAreaName: 'El Segundo', homeAreaLat: 33.916, homeAreaLng: -118.416,
    status: 'en-route', availableHours: HOURS_FULL,
    specialties: ['move-out', 'deep-clean', 'post-construction'], reliabilityScore: 97,
    currentJobId: 'j19', teamId: 'team-d', color: '#a855f7',
  },
  {
    id: 'c8', name: 'James Wilson', initials: 'JW', phone: '(310) 555-0108',
    email: 'james@example.com', rating: 4.7, totalJobs: 189,
    currentLat: 33.922, currentLng: -118.419,
    homeAreaName: 'El Segundo', homeAreaLat: 33.922, homeAreaLng: -118.419,
    status: 'en-route', availableHours: HOURS_FULL,
    specialties: ['standard', 'airbnb'], reliabilityScore: 89,
    currentJobId: 'j19', teamId: 'team-d', color: '#a855f7',
  },
  // ── Team Echo — Lakewood / Bellflower ────────────────────────────────────────
  {
    id: 'c9', name: 'Priya Patel', initials: 'PP', phone: '(562) 555-0109',
    email: 'priya@example.com', rating: 4.8, totalJobs: 143,
    currentLat: 33.853, currentLng: -118.124,
    homeAreaName: 'Lakewood', homeAreaLat: 33.853, homeAreaLng: -118.124,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['standard', 'deep-clean', 'airbnb'], reliabilityScore: 93,
    currentJobId: 'j22', teamId: 'team-e', color: '#14b8a6',
  },
  {
    id: 'c10', name: 'Kevin Brown', initials: 'KB', phone: '(562) 555-0110',
    email: 'kevin@example.com', rating: 4.7, totalJobs: 118,
    currentLat: 33.858, currentLng: -118.119,
    homeAreaName: 'Lakewood', homeAreaLat: 33.858, homeAreaLng: -118.119,
    status: 'cleaning', availableHours: HOURS_FULL,
    specialties: ['standard', 'move-out'], reliabilityScore: 87,
    currentJobId: 'j22', teamId: 'team-e', color: '#14b8a6',
  },
]

export const CUSTOMERS: Customer[] = [
  // 20 customers across LA area
  { id: 'cust1', name: 'Sarah Mitchell', phone: '(562) 555-1001', email: 'sarah.m@email.com',
    address: '1234 Ocean Blvd, Long Beach, CA 90802', lat: 33.763, lng: -118.189,
    city: 'Long Beach', preferredCleanerIds: ['c1', 'c2'], jobHistory: ['j1', 'j5', 'j12'],
    source: 'facebook', notes: 'Has 2 dogs. Prefers morning slots.', totalSpent: 1240, createdAt: '2024-09-15' },
  { id: 'cust2', name: 'Robert Chen', phone: '(310) 555-1002', email: 'r.chen@email.com',
    address: '456 Sepulveda Blvd, Torrance, CA 90505', lat: 33.831, lng: -118.346,
    city: 'Torrance', preferredCleanerIds: ['c3', 'c4'], jobHistory: ['j2', 'j7'],
    source: 'yelp', notes: 'Condo on 3rd floor, no elevator.', totalSpent: 680, createdAt: '2024-10-01' },
  { id: 'cust3', name: 'Lisa Thompson', phone: '(310) 555-1003', email: 'lisa.t@email.com',
    address: '789 Rosecrans Ave, Manhattan Beach, CA 90266', lat: 33.886, lng: -118.399,
    city: 'Manhattan Beach', preferredCleanerIds: [], jobHistory: ['j3'],
    source: 'referral', notes: 'Airbnb property — turnaround same day.', totalSpent: 320, createdAt: '2024-11-20' },
  { id: 'cust4', name: 'Michael Davis', phone: '(562) 555-1004', email: 'mdavis@email.com',
    address: '321 Atlantic Ave, Long Beach, CA 90807', lat: 33.827, lng: -118.178,
    city: 'Long Beach', preferredCleanerIds: ['c1', 'c2'], jobHistory: ['j4', 'j9', 'j14'],
    source: 'repeat', notes: 'Bi-weekly regular. 4BD/3BA.', totalSpent: 1950, createdAt: '2024-07-10' },
  { id: 'cust5', name: 'Jennifer Park', phone: '(310) 555-1005', email: 'jpark@email.com',
    address: '654 Hawthorne Blvd, Redondo Beach, CA 90278', lat: 33.862, lng: -118.367,
    city: 'Redondo Beach', preferredCleanerIds: ['c3'], jobHistory: ['j6', 'j11'],
    source: 'facebook', notes: 'Deep clean only.', totalSpent: 780, createdAt: '2024-08-22' },
  { id: 'cust6', name: 'William Foster', phone: '(562) 555-1006', email: 'wfoster@email.com',
    address: '987 Cherry Ave, Long Beach, CA 90813', lat: 33.801, lng: -118.181,
    city: 'Long Beach', preferredCleanerIds: [], jobHistory: ['j8'],
    source: 'text', notes: 'Move-out clean. New tenant coming in.', totalSpent: 420, createdAt: '2025-01-05' },
  { id: 'cust7', name: 'Amanda Wilson', phone: '(310) 555-1007', email: 'awilson@email.com',
    address: '147 Aviation Blvd, El Segundo, CA 90245', lat: 33.919, lng: -118.403,
    city: 'El Segundo', preferredCleanerIds: ['c7', 'c8'], jobHistory: ['j10', 'j15'],
    source: 'yelp', notes: 'Weekly. Has a cat allergy-friendly request.', totalSpent: 1100, createdAt: '2024-09-30' },
  { id: 'cust8', name: 'Kevin Martinez', phone: '(323) 555-1008', email: 'kmartinez@email.com',
    address: '258 Artesia Blvd, Compton, CA 90220', lat: 33.896, lng: -118.235,
    city: 'Compton', preferredCleanerIds: ['c5', 'c6'], jobHistory: ['j13'],
    source: 'facebook', notes: '', totalSpent: 180, createdAt: '2025-02-14' },
  { id: 'cust9', name: 'Nicole Brown', phone: '(310) 555-1009', email: 'nbrown@email.com',
    address: '369 Pacific Coast Hwy, Hermosa Beach, CA 90254', lat: 33.862, lng: -118.399,
    city: 'Hermosa Beach', preferredCleanerIds: [], jobHistory: ['j16'],
    source: 'referral', notes: 'Beach house. Post-party clean.', totalSpent: 290, createdAt: '2025-01-28' },
  { id: 'cust10', name: 'Christopher Lee', phone: '(562) 555-1010', email: 'clee@email.com',
    address: '741 Lakewood Blvd, Lakewood, CA 90712', lat: 33.852, lng: -118.120,
    city: 'Lakewood', preferredCleanerIds: ['c1'], jobHistory: ['j17', 'j19'],
    source: 'repeat', notes: 'Monthly deep clean. 3BD/2BA.', totalSpent: 860, createdAt: '2024-10-15' },
  { id: 'cust11', name: 'Stephanie Garcia', phone: '(310) 555-1011', email: 'sgarcia@email.com',
    address: '852 Inglewood Ave, Hawthorne, CA 90250', lat: 33.916, lng: -118.352,
    city: 'Hawthorne', preferredCleanerIds: ['c3', 'c4'], jobHistory: ['j18', 'j20'],
    source: 'facebook', notes: 'Prefers weekend slots.', totalSpent: 640, createdAt: '2024-11-05' },
  { id: 'cust12', name: 'Daniel Jackson', phone: '(562) 555-1012', email: 'djackson@email.com',
    address: '963 Pine Ave, Long Beach, CA 90813', lat: 33.797, lng: -118.171,
    city: 'Long Beach', preferredCleanerIds: [], jobHistory: [],
    source: 'yelp', notes: 'New customer. Studio apartment.', totalSpent: 0, createdAt: '2025-04-20' },
  { id: 'cust13', name: 'Tanya Reyes', phone: '(310) 555-1013', email: 'treyes@email.com',
    address: '445 Prairie Ave, Inglewood, CA 90301', lat: 33.961, lng: -118.352,
    city: 'Inglewood', preferredCleanerIds: ['c5', 'c6'], jobHistory: [],
    source: 'facebook', notes: 'New customer via FB group.', totalSpent: 0, createdAt: '2026-04-20' },
  { id: 'cust14', name: 'Marcus Webb', phone: '(310) 555-1014', email: 'mwebb@email.com',
    address: '501 Manchester Ave, Inglewood, CA 90301', lat: 33.958, lng: -118.374,
    city: 'Inglewood', preferredCleanerIds: ['c7', 'c8'], jobHistory: [],
    source: 'referral', notes: 'Airbnb host near SoFi. Same-day turnarounds.', totalSpent: 145, createdAt: '2026-03-10' },
  { id: 'cust15', name: 'Sandra Nguyen', phone: '(562) 555-1015', email: 'snguyen@email.com',
    address: '12200 Flower St, Bellflower, CA 90706', lat: 33.888, lng: -118.117,
    city: 'Bellflower', preferredCleanerIds: ['c9', 'c10'], jobHistory: [],
    source: 'yelp', notes: 'First deep clean. 3BD/2BA.', totalSpent: 0, createdAt: '2026-04-18' },
  { id: 'cust16', name: 'Tony Castillo', phone: '(562) 555-1016', email: 'tcastillo@email.com',
    address: '15200 Alondra Blvd, Norwalk, CA 90650', lat: 33.902, lng: -118.081,
    city: 'Norwalk', preferredCleanerIds: ['c9', 'c10'], jobHistory: [],
    source: 'repeat', notes: 'Bi-weekly standard. Very punctual.', totalSpent: 290, createdAt: '2025-12-01' },
]

// Generate today's date and surrounding dates
const today = new Date()
const fmt = (d: Date) => d.toISOString().split('T')[0]
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export const JOBS: Job[] = [
  // ── Team Alpha today (Long Beach area) ─────────────────────────────────────
  { id: 'j1', customerId: 'cust1', cleanerIds: ['c1', 'c2'],
    scheduledDate: fmt(today), scheduledTime: '08:00', estimatedDuration: 150,
    status: 'in-progress', serviceType: 'standard', price: 155, paid: false,
    address: '1234 Ocean Blvd, Long Beach, CA 90802', lat: 33.763, lng: -118.189,
    notes: '2 dogs, morning only', driveTimeMinutes: 8, createdAt: fmt(addDays(today, -3)) },
  { id: 'j13', customerId: 'cust4', cleanerIds: ['c1', 'c2'],
    scheduledDate: fmt(today), scheduledTime: '11:30', estimatedDuration: 120,
    status: 'confirmed', serviceType: 'deep', price: 215, paid: false,
    address: '321 Atlantic Ave, Long Beach, CA 90807', lat: 33.827, lng: -118.178,
    notes: '4BD deep', driveTimeMinutes: 10, createdAt: fmt(addDays(today, -2)) },
  { id: 'j14', customerId: 'cust12', cleanerIds: ['c1', 'c2'],
    scheduledDate: fmt(today), scheduledTime: '14:00', estimatedDuration: 90,
    status: 'scheduled', serviceType: 'standard', price: 115, paid: false,
    address: '963 Pine Ave, Long Beach, CA 90813', lat: 33.797, lng: -118.171,
    notes: 'Studio, new customer', driveTimeMinutes: 6, createdAt: fmt(addDays(today, -1)) },

  // ── Team Beta today (Torrance / South Bay) ──────────────────────────────────
  { id: 'j2', customerId: 'cust2', cleanerIds: ['c3', 'c4'],
    scheduledDate: fmt(today), scheduledTime: '08:00', estimatedDuration: 150,
    status: 'confirmed', serviceType: 'standard', price: 145, paid: false,
    address: '456 Sepulveda Blvd, Torrance, CA 90505', lat: 33.831, lng: -118.346,
    notes: '3rd floor, no elevator', driveTimeMinutes: 12, createdAt: fmt(addDays(today, -2)) },
  { id: 'j3', customerId: 'cust5', cleanerIds: ['c3', 'c4'],
    scheduledDate: fmt(today), scheduledTime: '11:00', estimatedDuration: 120,
    status: 'confirmed', serviceType: 'airbnb', price: 195, paid: true, paymentMethod: 'venmo',
    address: '654 Hawthorne Blvd, Redondo Beach, CA 90278', lat: 33.862, lng: -118.367,
    notes: 'Airbnb turnover, guest checks in 3pm', driveTimeMinutes: 18, createdAt: fmt(addDays(today, -1)) },
  { id: 'j15', customerId: 'cust3', cleanerIds: ['c3', 'c4'],
    scheduledDate: fmt(today), scheduledTime: '14:00', estimatedDuration: 120,
    status: 'scheduled', serviceType: 'airbnb', price: 185, paid: false,
    address: '789 Rosecrans Ave, Manhattan Beach, CA 90266', lat: 33.886, lng: -118.399,
    notes: 'Airbnb, same-day turnaround', driveTimeMinutes: 22, createdAt: fmt(addDays(today, -1)) },

  // ── Team Gamma today (Compton / Gardena / Inglewood) ───────────────────────
  { id: 'j16', customerId: 'cust8', cleanerIds: ['c5', 'c6'],
    scheduledDate: fmt(today), scheduledTime: '08:30', estimatedDuration: 120,
    status: 'in-progress', serviceType: 'standard', price: 135, paid: false,
    address: '258 Artesia Blvd, Compton, CA 90220', lat: 33.896, lng: -118.235,
    notes: '', driveTimeMinutes: 9, createdAt: fmt(addDays(today, -2)) },
  { id: 'j17', customerId: 'cust11', cleanerIds: ['c5', 'c6'],
    scheduledDate: fmt(today), scheduledTime: '11:30', estimatedDuration: 150,
    status: 'scheduled', serviceType: 'deep', price: 215, paid: false,
    address: '852 Inglewood Ave, Hawthorne, CA 90250', lat: 33.916, lng: -118.352,
    notes: 'Deep clean, prefers morning but confirmed 11:30', driveTimeMinutes: 14, createdAt: fmt(addDays(today, -1)) },
  { id: 'j18', customerId: 'cust13', cleanerIds: ['c5', 'c6'],
    scheduledDate: fmt(today), scheduledTime: '14:30', estimatedDuration: 90,
    status: 'scheduled', serviceType: 'standard', price: 125, paid: false,
    address: '445 Prairie Ave, Inglewood, CA 90301', lat: 33.961, lng: -118.352,
    notes: '', driveTimeMinutes: 11, createdAt: fmt(today) },

  // ── Team Delta today (El Segundo / LAX corridor) ────────────────────────────
  { id: 'j19', customerId: 'cust7', cleanerIds: ['c7', 'c8'],
    scheduledDate: fmt(today), scheduledTime: '08:00', estimatedDuration: 180,
    status: 'in-progress', serviceType: 'deep', price: 235, paid: false,
    address: '147 Aviation Blvd, El Segundo, CA 90245', lat: 33.919, lng: -118.403,
    notes: 'Weekly, cat allergy note', driveTimeMinutes: 7, createdAt: fmt(addDays(today, -3)) },
  { id: 'j20', customerId: 'cust14', cleanerIds: ['c7', 'c8'],
    scheduledDate: fmt(today), scheduledTime: '11:30', estimatedDuration: 90,
    status: 'confirmed', serviceType: 'airbnb', price: 145, paid: true, paymentMethod: 'venmo',
    address: '501 Manchester Ave, Inglewood, CA 90301', lat: 33.958, lng: -118.374,
    notes: 'Near SoFi Stadium, guest arrives 2pm', driveTimeMinutes: 15, createdAt: fmt(addDays(today, -1)) },
  { id: 'j21', customerId: 'cust9', cleanerIds: ['c7', 'c8'],
    scheduledDate: fmt(today), scheduledTime: '13:30', estimatedDuration: 150,
    status: 'scheduled', serviceType: 'standard', price: 155, paid: false,
    address: '369 Pacific Coast Hwy, Hermosa Beach, CA 90254', lat: 33.862, lng: -118.399,
    notes: 'Beach house', driveTimeMinutes: 20, createdAt: fmt(addDays(today, -1)) },

  // ── Team Echo today (Lakewood / Bellflower / Cerritos) ──────────────────────
  { id: 'j22', customerId: 'cust10', cleanerIds: ['c9', 'c10'],
    scheduledDate: fmt(today), scheduledTime: '08:00', estimatedDuration: 150,
    status: 'in-progress', serviceType: 'standard', price: 155, paid: false,
    address: '741 Lakewood Blvd, Lakewood, CA 90712', lat: 33.852, lng: -118.120,
    notes: 'Monthly, 3BD', driveTimeMinutes: 6, createdAt: fmt(addDays(today, -4)) },
  { id: 'j23', customerId: 'cust15', cleanerIds: ['c9', 'c10'],
    scheduledDate: fmt(today), scheduledTime: '11:00', estimatedDuration: 180,
    status: 'scheduled', serviceType: 'deep', price: 245, paid: false,
    address: '12200 Flower St, Bellflower, CA 90706', lat: 33.888, lng: -118.117,
    notes: 'First deep clean', driveTimeMinutes: 8, createdAt: fmt(addDays(today, -2)) },
  { id: 'j24', customerId: 'cust16', cleanerIds: ['c9', 'c10'],
    scheduledDate: fmt(today), scheduledTime: '14:30', estimatedDuration: 120,
    status: 'confirmed', serviceType: 'standard', price: 145, paid: false,
    address: '15200 Alondra Blvd, Norwalk, CA 90650', lat: 33.902, lng: -118.081,
    notes: 'Bi-weekly', driveTimeMinutes: 12, createdAt: fmt(addDays(today, -1)) },

  // ── Past jobs (for history/payments) ───────────────────────────────────────
  { id: 'j7', customerId: 'cust2', cleanerIds: ['c3', 'c4'],
    scheduledDate: fmt(addDays(today, -1)), scheduledTime: '09:00', estimatedDuration: 150,
    status: 'completed', serviceType: 'standard', price: 145, paid: true, paymentMethod: 'zelle',
    address: '456 Sepulveda Blvd, Torrance, CA 90505', lat: 33.831, lng: -118.346,
    notes: '', driveTimeMinutes: 12, createdAt: fmt(addDays(today, -5)) },
  { id: 'j8', customerId: 'cust6', cleanerIds: ['c1', 'c2'],
    scheduledDate: fmt(addDays(today, -2)), scheduledTime: '08:00', estimatedDuration: 300,
    status: 'completed', serviceType: 'move-out', price: 380, paid: true, paymentMethod: 'zelle',
    address: '987 Cherry Ave, Long Beach, CA 90813', lat: 33.801, lng: -118.181,
    notes: 'Move-out clean', driveTimeMinutes: 14, createdAt: fmt(addDays(today, -7)) },
  { id: 'j9', customerId: 'cust4', cleanerIds: ['c1', 'c2'],
    scheduledDate: fmt(addDays(today, -7)), scheduledTime: '09:00', estimatedDuration: 240,
    status: 'completed', serviceType: 'standard', price: 175, paid: true, paymentMethod: 'venmo',
    address: '321 Atlantic Ave, Long Beach, CA 90807', lat: 33.827, lng: -118.178,
    notes: '', driveTimeMinutes: 10, createdAt: fmt(addDays(today, -14)) },
  { id: 'j11', customerId: 'cust5', cleanerIds: ['c3', 'c4'],
    scheduledDate: fmt(addDays(today, -14)), scheduledTime: '10:00', estimatedDuration: 210,
    status: 'completed', serviceType: 'deep', price: 245, paid: true, paymentMethod: 'cash',
    address: '654 Hawthorne Blvd, Redondo Beach, CA 90278', lat: 33.862, lng: -118.367,
    notes: '', driveTimeMinutes: 15, createdAt: fmt(addDays(today, -21)) },
  { id: 'j12', customerId: 'cust1', cleanerIds: ['c1', 'c2'],
    scheduledDate: fmt(addDays(today, -14)), scheduledTime: '09:00', estimatedDuration: 180,
    status: 'completed', serviceType: 'standard', price: 165, paid: true, paymentMethod: 'zelle',
    address: '1234 Ocean Blvd, Long Beach, CA 90802', lat: 33.763, lng: -118.189,
    notes: '', driveTimeMinutes: 8, createdAt: fmt(addDays(today, -18)) },
]

export const PAYMENTS: Payment[] = [
  { id: 'p1', jobId: 'j7', customerId: 'cust2', cleanerIds: ['c3', 'c4'],
    amount: 145, method: 'zelle', status: 'confirmed',
    confirmationNote: 'Zelle confirmed from Robert Chen', receivedAt: fmt(addDays(today, -1)) + 'T15:30:00',
    month: fmt(today).slice(0, 7) },
  { id: 'p2', jobId: 'j8', customerId: 'cust6', cleanerIds: ['c1', 'c2'],
    amount: 380, method: 'zelle', status: 'confirmed',
    confirmationNote: 'Zelle from William Foster — move-out clean', receivedAt: fmt(addDays(today, -2)) + 'T14:00:00',
    month: fmt(today).slice(0, 7) },
  { id: 'p3', jobId: 'j3', customerId: 'cust3', cleanerIds: ['c3', 'c4'],
    amount: 195, method: 'venmo', status: 'confirmed',
    confirmationNote: 'Venmo from Lisa Thompson', receivedAt: fmt(today) + 'T16:00:00',
    month: fmt(today).slice(0, 7) },
  { id: 'p4', jobId: 'j9', customerId: 'cust4', cleanerIds: ['c1', 'c2'],
    amount: 175, method: 'venmo', status: 'confirmed',
    confirmationNote: 'Venmo from Michael Davis', receivedAt: fmt(addDays(today, -7)) + 'T17:00:00',
    month: fmt(today).slice(0, 7) },
  { id: 'p5', jobId: 'j11', customerId: 'cust5', cleanerIds: ['c3', 'c4'],
    amount: 245, method: 'cash', status: 'confirmed',
    confirmationNote: 'Cash in hand — deep clean', receivedAt: fmt(addDays(today, -14)) + 'T12:00:00',
    month: fmt(addDays(today, -14)).slice(0, 7) },
  { id: 'p6', jobId: 'j12', customerId: 'cust1', cleanerIds: ['c1', 'c2'],
    amount: 165, method: 'zelle', status: 'confirmed',
    confirmationNote: 'Zelle from Sarah Mitchell', receivedAt: fmt(addDays(today, -14)) + 'T11:00:00',
    month: fmt(addDays(today, -14)).slice(0, 7) },
]

export const FACEBOOK_GROUPS: FacebookGroup[] = [
  // 20 real-sounding LA-area Facebook groups
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

// Helper to get today's jobs
export function getTodayJobs(): Job[] {
  return JOBS.filter(j => j.scheduledDate === fmt(today))
}

// Helper to get upcoming jobs (next 7 days)
export function getUpcomingJobs(): Job[] {
  return JOBS.filter(j => j.scheduledDate > fmt(today)).slice(0, 8)
}

// Helper to get total revenue this month
export function getMonthRevenue(): number {
  return PAYMENTS.filter(p => p.month === fmt(today).slice(0, 7))
    .reduce((sum, p) => sum + p.amount, 0)
}

// Helper to get pending payment amount
export function getPendingRevenue(): number {
  return JOBS.filter(j => !j.paid && j.status === 'completed')
    .reduce((sum, j) => sum + j.price, 0)
}
