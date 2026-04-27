-- Kardama.ai initial schema
-- Two roles: owner_operator (full dashboard) and cleaner (personal dashboard).
-- All app tables live in `public`. `auth.users` is managed by Supabase Auth.

-- ───────────────────────────── enums ─────────────────────────────
create type public.user_role as enum ('owner_operator', 'cleaner');
create type public.cleaner_status as enum ('available', 'en-route', 'cleaning', 'off-duty');
create type public.service_specialty as enum ('deep-clean', 'move-out', 'post-construction', 'airbnb', 'standard');
create type public.lead_source as enum ('facebook', 'yelp', 'referral', 'text', 'repeat');
create type public.job_status as enum ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled');
create type public.service_type as enum ('standard', 'deep', 'move-out', 'post-construction', 'airbnb');
create type public.payment_method as enum ('zelle', 'venmo', 'cash');
create type public.payment_status as enum ('pending', 'received', 'confirmed');
create type public.booking_request_status as enum ('pending', 'accepted', 'declined', 'converted');

-- ───────────────────────────── tables ─────────────────────────────

-- Cleaners (the "maids"). Text id matches the existing app's c1/c2/... convention.
create table public.cleaners (
  id text primary key,
  name text not null,
  initials text not null,
  phone text not null,
  email text not null unique,
  rating numeric(3,2) not null default 0,
  total_jobs int not null default 0,
  current_lat numeric(10,6) not null default 0,
  current_lng numeric(10,6) not null default 0,
  home_area_name text not null,
  home_area_lat numeric(10,6) not null default 0,
  home_area_lng numeric(10,6) not null default 0,
  status public.cleaner_status not null default 'off-duty',
  available_hours jsonb not null default '{}'::jsonb,
  specialties public.service_specialty[] not null default '{}',
  reliability_score int not null default 0,
  current_job_id text,
  team_id text,
  color text not null default '#3b82f6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profile rows mirror auth.users 1:1 and add app-level role + cleaner link.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  cleaner_id text references public.cleaners(id) on delete set null,
  display_name text,
  created_at timestamptz not null default now(),
  -- A cleaner profile must point at a cleaner row; an owner_operator must not.
  constraint cleaner_must_have_cleaner_id check (
    (role = 'cleaner' and cleaner_id is not null) or
    (role = 'owner_operator' and cleaner_id is null)
  )
);
create index profiles_role_idx on public.profiles(role);
create index profiles_cleaner_id_idx on public.profiles(cleaner_id);

create table public.customers (
  id text primary key,
  name text not null,
  phone text not null,
  email text not null,
  address text not null,
  lat numeric(10,6) not null default 0,
  lng numeric(10,6) not null default 0,
  city text not null,
  preferred_cleaner_ids text[] not null default '{}',
  job_history text[] not null default '{}',
  source public.lead_source not null default 'facebook',
  notes text not null default '',
  total_spent numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index customers_city_idx on public.customers(city);

create table public.jobs (
  id text primary key,
  customer_id text not null references public.customers(id) on delete restrict,
  cleaner_ids text[] not null default '{}',
  scheduled_date date not null,
  scheduled_time text not null,
  estimated_duration int not null,
  actual_duration int,
  status public.job_status not null default 'scheduled',
  service_type public.service_type not null,
  price numeric(10,2) not null,
  paid boolean not null default false,
  payment_method public.payment_method,
  payment_confirmation_id text,
  address text not null,
  lat numeric(10,6) not null default 0,
  lng numeric(10,6) not null default 0,
  notes text not null default '',
  drive_time_minutes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_scheduled_date_idx on public.jobs(scheduled_date);
create index jobs_status_idx on public.jobs(status);
create index jobs_cleaner_ids_idx on public.jobs using gin(cleaner_ids);

create table public.payments (
  id text primary key,
  job_id text not null references public.jobs(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete restrict,
  cleaner_ids text[] not null default '{}',
  amount numeric(10,2) not null,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  confirmation_note text not null default '',
  received_at timestamptz not null default now(),
  month text not null
);
create index payments_month_idx on public.payments(month);

-- Public booking form submissions. Anonymous users can insert; owners review them.
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  address text not null,
  city text,
  service_type public.service_type not null default 'standard',
  preferred_date date,
  preferred_time text,
  notes text not null default '',
  status public.booking_request_status not null default 'pending',
  source text default 'web',
  converted_customer_id text references public.customers(id) on delete set null,
  converted_job_id text references public.jobs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index booking_requests_status_idx on public.booking_requests(status);

-- ───────────────────────────── triggers: updated_at ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger cleaners_set_updated_at before update on public.cleaners
  for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ───────────────────────────── helper functions for RLS ─────────────────────────────
-- SECURITY DEFINER helpers avoid recursive RLS lookups when policies reference profiles.
create or replace function public.is_owner_operator()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'owner_operator'
  );
$$;

create or replace function public.current_cleaner_id()
returns text language sql security definer stable set search_path = public as $$
  select cleaner_id from public.profiles
  where user_id = auth.uid() and role = 'cleaner';
$$;

-- ───────────────────────────── enable RLS ─────────────────────────────
alter table public.profiles enable row level security;
alter table public.cleaners enable row level security;
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.payments enable row level security;
alter table public.booking_requests enable row level security;

-- ───────────────────────────── policies: profiles ─────────────────────────────
-- Users can read their own profile. Owners can read all profiles (to manage the team).
create policy profiles_self_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_owner_operator());
-- Owners manage profiles (used by the invite-cleaner action). Service role bypasses RLS anyway.
create policy profiles_owner_all on public.profiles for all to authenticated
  using (public.is_owner_operator()) with check (public.is_owner_operator());

-- ───────────────────────────── policies: cleaners ─────────────────────────────
-- Both roles can read cleaners (so cleaners see teammates on schedule/map).
create policy cleaners_select on public.cleaners for select to authenticated using (true);
-- Owners full write.
create policy cleaners_owner_write on public.cleaners for all to authenticated
  using (public.is_owner_operator()) with check (public.is_owner_operator());
-- A cleaner can update their own row (status, position).
create policy cleaners_self_update on public.cleaners for update to authenticated
  using (id = public.current_cleaner_id())
  with check (id = public.current_cleaner_id());

-- ───────────────────────────── policies: customers ─────────────────────────────
-- Owners: full access. Cleaners: only customers they're assigned to via jobs.
create policy customers_owner_all on public.customers for all to authenticated
  using (public.is_owner_operator()) with check (public.is_owner_operator());
create policy customers_cleaner_select on public.customers for select to authenticated
  using (
    public.current_cleaner_id() is not null and exists (
      select 1 from public.jobs j
      where j.customer_id = customers.id
        and public.current_cleaner_id() = any(j.cleaner_ids)
    )
  );

-- ───────────────────────────── policies: jobs ─────────────────────────────
create policy jobs_owner_all on public.jobs for all to authenticated
  using (public.is_owner_operator()) with check (public.is_owner_operator());
-- Cleaners see jobs they're assigned to.
create policy jobs_cleaner_select on public.jobs for select to authenticated
  using (public.current_cleaner_id() = any(cleaner_ids));
-- Cleaners can mark their own jobs in-progress/completed (status update only — guarded server-side too).
create policy jobs_cleaner_update on public.jobs for update to authenticated
  using (public.current_cleaner_id() = any(cleaner_ids))
  with check (public.current_cleaner_id() = any(cleaner_ids));

-- ───────────────────────────── policies: payments ─────────────────────────────
create policy payments_owner_all on public.payments for all to authenticated
  using (public.is_owner_operator()) with check (public.is_owner_operator());
-- Cleaners see payments tied to their jobs (so they can see which of their jobs got paid).
create policy payments_cleaner_select on public.payments for select to authenticated
  using (public.current_cleaner_id() = any(cleaner_ids));

-- ───────────────────────────── policies: booking_requests ─────────────────────────────
-- Anonymous public form submissions allowed.
create policy booking_requests_public_insert on public.booking_requests for insert to anon
  with check (true);
-- Authenticated owners read/update them.
create policy booking_requests_owner_all on public.booking_requests for all to authenticated
  using (public.is_owner_operator()) with check (public.is_owner_operator());
