-- Promote teams to a first-class entity so new teams can be added without code changes.
-- Keeps the existing text id convention ('team-a', 'team-b', ...) so the many call sites
-- that pass these identifiers as strings (campaign-engine, scheduling-engine, RoutingPanel,
-- LiveMapView, daily_routes) keep working unchanged.

create table public.teams (
  id          text primary key,
  name        text not null,
  color       text not null default '#3b82f6',
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

-- Seed the logical teams already referenced by the cleaner/seed data.
insert into public.teams (id, name, color) values
  ('team-a', 'Team Alpha',   '#5EEAD4'),
  ('team-b', 'Team Beta',    '#34D399'),
  ('team-c', 'Team Gamma',   '#FBBF24'),
  ('team-d', 'Team Delta',   '#60A5FA'),
  ('team-e', 'Team Epsilon', '#A78BFA')
on conflict (id) do nothing;

-- Foreign-key cleaners.team_id (was free-form text). Backfill any orphan id to team-a
-- so the constraint can be added without manual cleanup.
update public.cleaners
   set team_id = 'team-a'
 where team_id is not null
   and team_id not in (select id from public.teams);

alter table public.cleaners
  add constraint cleaners_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete set null;

create index if not exists cleaners_team_id_idx on public.cleaners(team_id);

-- Each appointment is owned by a team. Denormalized from cleaner_ids for O(1) schedule lookups.
alter table public.jobs
  add column team_id text references public.teams(id) on delete set null;

create index jobs_team_id_scheduled_date_idx
  on public.jobs(team_id, scheduled_date);

-- Backfill jobs.team_id from the first assigned cleaner's team.
update public.jobs j
   set team_id = c.team_id
  from public.cleaners c
 where j.team_id is null
   and array_length(j.cleaner_ids, 1) > 0
   and c.id = j.cleaner_ids[1];

-- daily_routes already keys by team_id (text). Add the FK now that teams exists.
alter table public.daily_routes
  add constraint daily_routes_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete cascade;

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.teams enable row level security;

-- Owners: full CRUD (so they can add/rename/archive teams from the UI).
create policy teams_owner_all on public.teams for all to authenticated
  using (
    exists (
      select 1 from public.profiles
       where user_id = auth.uid() and role = 'owner_operator'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
       where user_id = auth.uid() and role = 'owner_operator'
    )
  );

-- Everyone authed can read teams (cleaners need names/colors for their own schedule).
create policy teams_read_all on public.teams for select to authenticated
  using (true);

-- ── View: team schedule ───────────────────────────────────────────────
-- Convenience view returning each team's appointments. Use from the data layer
-- as: select * from team_schedule where team_id = $1 and scheduled_date between $2 and $3
create or replace view public.team_schedule as
  select
    j.team_id,
    t.name        as team_name,
    t.color       as team_color,
    j.id          as job_id,
    j.customer_id,
    j.scheduled_date,
    j.scheduled_time,
    j.estimated_duration,
    j.status,
    j.service_type,
    j.address,
    j.cleaner_ids
  from public.jobs j
  join public.teams t on t.id = j.team_id;
