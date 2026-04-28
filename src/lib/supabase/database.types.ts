// Hand-written type stubs for the Supabase tables. Mirror migrations/0001_init.sql.
// Once you have the Supabase CLI, replace with:
//   supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

type CleanerRow = {
  id: string
  name: string
  initials: string
  phone: string
  email: string
  rating: number
  total_jobs: number
  current_lat: number
  current_lng: number
  home_area_name: string
  home_area_lat: number
  home_area_lng: number
  status: 'available' | 'en-route' | 'cleaning' | 'off-duty'
  available_hours: Record<string, { start: string; end: string } | null>
  specialties: ('deep-clean' | 'move-out' | 'post-construction' | 'airbnb' | 'standard')[]
  reliability_score: number
  current_job_id: string | null
  team_id: string | null
  color: string
  created_at: string
  updated_at: string
}
type CleanerInsert = Omit<CleanerRow, 'created_at' | 'updated_at'>
type CleanerUpdate = Partial<CleanerInsert>

type ProfileRow = {
  user_id: string
  role: 'owner_operator' | 'cleaner'
  cleaner_id: string | null
  display_name: string | null
  created_at: string
}
type ProfileInsert = {
  user_id: string
  role: 'owner_operator' | 'cleaner'
  cleaner_id?: string | null
  display_name?: string | null
}
type ProfileUpdate = Partial<Omit<ProfileInsert, 'user_id'>>

type CustomerRow = {
  id: string
  name: string
  phone: string
  email: string
  address: string
  lat: number
  lng: number
  city: string
  preferred_cleaner_ids: string[]
  job_history: string[]
  source: 'facebook' | 'yelp' | 'referral' | 'text' | 'repeat'
  notes: string
  total_spent: number
  created_at: string
}
type CustomerInsert = Omit<CustomerRow, 'created_at'> & { created_at?: string }
type CustomerUpdate = Partial<CustomerInsert>

type JobRow = {
  id: string
  customer_id: string
  cleaner_ids: string[]
  scheduled_date: string
  scheduled_time: string
  estimated_duration: number
  actual_duration: number | null
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  service_type: 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb'
  price: number
  paid: boolean
  payment_method: 'zelle' | 'venmo' | 'cash' | null
  payment_confirmation_id: string | null
  address: string
  lat: number
  lng: number
  notes: string
  drive_time_minutes: number
  created_at: string
  updated_at: string
}
type JobInsert = Omit<JobRow, 'created_at' | 'updated_at'>
type JobUpdate = Partial<JobInsert>

type PaymentRow = {
  id: string
  job_id: string
  customer_id: string
  cleaner_ids: string[]
  amount: number
  method: 'zelle' | 'venmo' | 'cash'
  status: 'pending' | 'received' | 'confirmed'
  confirmation_note: string
  received_at: string
  month: string
}
type PaymentUpdate = Partial<PaymentRow>

type BookingRequestRow = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  address: string
  unit: string | null
  city: string | null
  service_type: 'standard' | 'deep' | 'move-out' | 'post-construction' | 'airbnb'
  preferred_date: string | null
  preferred_time: string | null
  preferred_days: string[]
  preferred_arrival_times: string[]
  preferred_exit_times: string[]
  home_size: string | null
  cleaning_frequency: string | null
  has_pets_allergies: string | null
  notes: string
  status: 'pending' | 'accepted' | 'declined' | 'converted'
  source: string | null
  converted_customer_id: string | null
  converted_job_id: string | null
  created_at: string
}
type BookingRequestInsert = Omit<
  BookingRequestRow,
  'id' | 'created_at' | 'status' | 'converted_customer_id' | 'converted_job_id'
    | 'preferred_days' | 'preferred_arrival_times' | 'preferred_exit_times'
> & {
  status?: BookingRequestRow['status']
  preferred_days?: string[]
  preferred_arrival_times?: string[]
  preferred_exit_times?: string[]
}
type BookingRequestUpdate = Partial<BookingRequestRow>

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [] }
      cleaners: { Row: CleanerRow; Insert: CleanerInsert; Update: CleanerUpdate; Relationships: [] }
      customers: { Row: CustomerRow; Insert: CustomerInsert; Update: CustomerUpdate; Relationships: [] }
      jobs: { Row: JobRow; Insert: JobInsert; Update: JobUpdate; Relationships: [] }
      payments: { Row: PaymentRow; Insert: PaymentRow; Update: PaymentUpdate; Relationships: [] }
      booking_requests: { Row: BookingRequestRow; Insert: BookingRequestInsert; Update: BookingRequestUpdate; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
