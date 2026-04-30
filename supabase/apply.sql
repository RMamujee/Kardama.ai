-- ============================================================
-- Kardama.ai — One-shot schema setup (idempotent, safe to re-run)
-- Paste this entire file into the Supabase SQL editor and run.
-- After it completes, hit POST /api/admin/apply-schema to
-- rename cleaners, upsert teams, and create test accounts.
-- ============================================================

-- ── 1. Enums (add missing values) ───────────────────────────
alter type public.payment_status add value if not exists 'cancelled';

-- ── 2. booking_requests extra columns (0002 + 0009) ─────────
alter table public.booking_requests
  add column if not exists unit                    text,
  add column if not exists home_size               text,
  add column if not exists cleaning_frequency      text,
  add column if not exists preferred_days          text[] not null default '{}',
  add column if not exists preferred_arrival_times text[] not null default '{}',
  add column if not exists preferred_exit_times    text[] not null default '{}',
  add column if not exists has_pets_allergies      text,
  add column if not exists assigned_team           integer check (assigned_team between 1 and 5),
  add column if not exists payment_method          text,
  add column if not exists calendar_event_id       text;

-- ── 3. payments: make columns nullable, add booking_ref ─────
alter table public.payments alter column job_id      drop not null;
alter table public.payments alter column method      drop not null;
alter table public.payments alter column customer_id drop not null;
alter table public.payments add column if not exists booking_ref text;

-- ── 4. social_leads table ───────────────────────────────────
create table if not exists public.social_leads (
  id             uuid      primary key default gen_random_uuid(),
  platform       text      not null check (platform in ('facebook-group','facebook-page','instagram','nextdoor','messenger')),
  author         text      not null,
  author_initials text     not null default '',
  group_or_page  text      not null default '',
  content        text      not null,
  posted_at      timestamptz not null default now(),
  status         text      not null default 'new' check (status in ('new','responded','captured','dismissed')),
  location       text      not null default '',
  urgency        text      not null default 'medium' check (urgency in ('high','medium','low')),
  responded_at   timestamptz,
  response_used  text,
  captured_at    timestamptz,
  likes          int       not null default 0,
  comments_count int       not null default 0,
  external_id    text      unique,
  messenger_psid text,
  raw_data       jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists social_leads_status_idx    on public.social_leads(status);
create index if not exists social_leads_posted_at_idx on public.social_leads(posted_at desc);
create index if not exists social_leads_platform_idx  on public.social_leads(platform);
alter table public.social_leads enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='social_leads' and policyname='owner_operator can manage social_leads') then
    create policy "owner_operator can manage social_leads" on public.social_leads for all
      using  (exists (select 1 from public.profiles where user_id=auth.uid() and role='owner_operator'))
      with check (exists (select 1 from public.profiles where user_id=auth.uid() and role='owner_operator'));
  end if;
end $$;
create or replace function public.handle_social_leads_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create or replace trigger social_leads_updated_at
  before update on public.social_leads
  for each row execute procedure public.handle_social_leads_updated_at();

-- ── 5. daily_routes table ───────────────────────────────────
create table if not exists public.daily_routes (
  id              uuid        primary key default gen_random_uuid(),
  team_id         text        not null,
  route_date      date        not null,
  stop_order      jsonb       not null default '[]',
  segments        jsonb       not null default '[]',
  legs            jsonb       not null default '[]',
  total_drive_min int         not null default 0,
  total_km        numeric(6,1) not null default 0,
  computed_at     timestamptz not null default now(),
  unique (team_id, route_date)
);
alter table public.daily_routes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='daily_routes' and policyname='owners full') then
    create policy "owners full" on public.daily_routes for all
      using (exists (select 1 from public.profiles where user_id=auth.uid() and role='owner_operator'));
  end if;
  if not exists (select 1 from pg_policies where tablename='daily_routes' and policyname='cleaners read own team') then
    create policy "cleaners read own team" on public.daily_routes for select
      using (exists (
        select 1 from public.cleaners c
        join public.profiles p on p.cleaner_id=c.id
        where p.user_id=auth.uid() and c.team_id=daily_routes.team_id
      ));
  end if;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.daily_routes;
exception when others then null; end $$;

-- ── 6. messages + push_subscriptions tables ─────────────────
create table if not exists public.messages (
  id          uuid        primary key default gen_random_uuid(),
  cleaner_id  text        not null references public.cleaners(id) on delete cascade,
  sender_role text        not null check (sender_role in ('owner','cleaner')),
  content     text        not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists messages_cleaner_id_idx on public.messages(cleaner_id);
create index if not exists messages_created_at_idx  on public.messages(created_at);

create table if not exists public.push_subscriptions (
  id          uuid    primary key default gen_random_uuid(),
  cleaner_id  text    not null unique references public.cleaners(id) on delete cascade,
  subscription jsonb  not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create or replace trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.messages           enable row level security;
alter table public.push_subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_owner_all') then
    create policy messages_owner_all on public.messages for all to authenticated
      using  (public.is_owner_operator()) with check (public.is_owner_operator());
  end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_cleaner_select') then
    create policy messages_cleaner_select on public.messages for select to authenticated
      using (cleaner_id = public.current_cleaner_id());
  end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_cleaner_insert') then
    create policy messages_cleaner_insert on public.messages for insert to authenticated
      with check (cleaner_id = public.current_cleaner_id() and sender_role = 'cleaner');
  end if;
  if not exists (select 1 from pg_policies where tablename='push_subscriptions' and policyname='push_subs_cleaner_all') then
    create policy push_subs_cleaner_all on public.push_subscriptions for all to authenticated
      using  (cleaner_id = public.current_cleaner_id())
      with check (cleaner_id = public.current_cleaner_id());
  end if;
  if not exists (select 1 from pg_policies where tablename='push_subscriptions' and policyname='push_subs_owner_read') then
    create policy push_subs_owner_read on public.push_subscriptions for select to authenticated
      using (public.is_owner_operator());
  end if;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;

-- ── 7. teams table ──────────────────────────────────────────
create table if not exists public.teams (
  id         text        primary key,
  name       text        not null,
  color      text        not null default '#3b82f6',
  archived   boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from information_schema.triggers where trigger_name='teams_set_updated_at') then
    create trigger teams_set_updated_at before update on public.teams
      for each row execute function public.set_updated_at();
  end if;
end $$;

insert into public.teams (id, name, color) values
  ('team-a', 'Team A', '#5EEAD4'),
  ('team-b', 'Team B', '#34D399'),
  ('team-c', 'Team C', '#FBBF24'),
  ('team-d', 'Team D', '#60A5FA'),
  ('team-e', 'Team E', '#A78BFA')
on conflict (id) do update set name=excluded.name, color=excluded.color;

alter table public.teams enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='teams' and policyname='teams_owner_all') then
    create policy teams_owner_all on public.teams for all to authenticated
      using  (exists (select 1 from public.profiles where user_id=auth.uid() and role='owner_operator'))
      with check (exists (select 1 from public.profiles where user_id=auth.uid() and role='owner_operator'));
  end if;
  if not exists (select 1 from pg_policies where tablename='teams' and policyname='teams_read_all') then
    create policy teams_read_all on public.teams for select to authenticated using (true);
  end if;
end $$;

-- ── 8. team_id FK on cleaners ───────────────────────────────
alter table public.cleaners add column if not exists team_id text;
do $$ begin
  if not exists (select 1 from information_schema.table_constraints
                  where constraint_name='cleaners_team_id_fkey') then
    -- Backfill any orphan team_id before adding FK
    update public.cleaners set team_id='team-a'
      where team_id is not null and team_id not in (select id from public.teams);
    alter table public.cleaners
      add constraint cleaners_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  end if;
end $$;
create index if not exists cleaners_team_id_idx on public.cleaners(team_id);

-- ── 9. team_id column on jobs ───────────────────────────────
alter table public.jobs add column if not exists team_id text references public.teams(id) on delete set null;
create index if not exists jobs_team_id_scheduled_date_idx on public.jobs(team_id, scheduled_date);

-- Backfill jobs.team_id from first cleaner's team
update public.jobs j set team_id = c.team_id
  from public.cleaners c
  where j.team_id is null
    and array_length(j.cleaner_ids,1) > 0
    and c.id = j.cleaner_ids[1];

-- ── 10. daily_routes: add teams FK now that teams exists ────
do $$ begin
  if not exists (select 1 from information_schema.table_constraints
                  where constraint_name='daily_routes_team_id_fkey') then
    alter table public.daily_routes
      add constraint daily_routes_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete cascade;
  end if;
end $$;

-- ── 11. team_schedule view ──────────────────────────────────
create or replace view public.team_schedule as
  select
    j.team_id, t.name as team_name, t.color as team_color,
    j.id as job_id, j.customer_id,
    j.scheduled_date, j.scheduled_time, j.estimated_duration,
    j.status, j.service_type, j.address, j.cleaner_ids
  from public.jobs j
  join public.teams t on t.id = j.team_id;

-- ── 12. Rename cleaners (run before apply-schema endpoint) ──
update public.cleaners set name='Cleaner 1',  initials='C1',  email='cleaner1@kardama.ai'  where id='c1';
update public.cleaners set name='Cleaner 2',  initials='C2',  email='cleaner2@kardama.ai'  where id='c2';
update public.cleaners set name='Cleaner 3',  initials='C3',  email='cleaner3@kardama.ai'  where id='c3';
update public.cleaners set name='Cleaner 4',  initials='C4',  email='cleaner4@kardama.ai'  where id='c4';
update public.cleaners set name='Cleaner 5',  initials='C5',  email='cleaner5@kardama.ai'  where id='c5';
update public.cleaners set name='Cleaner 6',  initials='C6',  email='cleaner6@kardama.ai'  where id='c6';
update public.cleaners set name='Cleaner 7',  initials='C7',  email='cleaner7@kardama.ai'  where id='c7';
update public.cleaners set name='Cleaner 8',  initials='C8',  email='cleaner8@kardama.ai'  where id='c8';
update public.cleaners set name='Cleaner 9',  initials='C9',  email='cleaner9@kardama.ai'  where id='c9';
update public.cleaners set name='Cleaner 10', initials='C10', email='cleaner10@kardama.ai' where id='c10';

-- ── 13. Clear test/seed transactional data ──────────────────
-- Comment these out if you want to keep existing records.
truncate table public.payments         restart identity cascade;
truncate table public.jobs             restart identity cascade;
truncate table public.booking_requests restart identity cascade;
truncate table public.customers        restart identity cascade;
truncate table public.social_leads     restart identity cascade;
truncate table public.messages         restart identity cascade;

-- Done. Now hit: POST /api/admin/apply-schema
-- to create test accounts and confirm data setup.
