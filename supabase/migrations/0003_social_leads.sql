-- Social leads: real leads scraped from Facebook groups, Messenger DMs, etc.
-- 'external_id' is the Facebook post/message ID used for deduplication on upsert.

create table public.social_leads (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook-group','facebook-page','instagram','nextdoor','messenger')),
  author text not null,
  author_initials text not null default '',
  group_or_page text not null default '',
  content text not null,
  posted_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','responded','captured','dismissed')),
  location text not null default '',
  urgency text not null default 'medium' check (urgency in ('high','medium','low')),
  responded_at timestamptz,
  response_used text,
  captured_at timestamptz,
  likes int not null default 0,
  comments_count int not null default 0,
  external_id text unique,
  messenger_psid text,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_leads_status_idx on public.social_leads(status);
create index social_leads_posted_at_idx on public.social_leads(posted_at desc);
create index social_leads_platform_idx on public.social_leads(platform);

alter table public.social_leads enable row level security;

-- Owner operators have full read/write access
create policy "owner_operator can manage social_leads"
  on public.social_leads for all
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

-- Trigger to keep updated_at current
create or replace function public.handle_social_leads_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger social_leads_updated_at
  before update on public.social_leads
  for each row execute procedure public.handle_social_leads_updated_at();
