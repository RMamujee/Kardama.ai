-- Chat messages between owner and cleaners
create table public.messages (
  id          uuid      primary key default gen_random_uuid(),
  cleaner_id  text      not null references public.cleaners(id) on delete cascade,
  sender_role text      not null check (sender_role in ('owner', 'cleaner')),
  content     text      not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index messages_cleaner_id_idx on public.messages(cleaner_id);
create index messages_created_at_idx  on public.messages(created_at);

-- Web push subscriptions for cleaners (one row per cleaner, upsert on re-register)
create table public.push_subscriptions (
  id          uuid      primary key default gen_random_uuid(),
  cleaner_id  text      not null unique references public.cleaners(id) on delete cascade,
  subscription jsonb    not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.messages          enable row level security;
alter table public.push_subscriptions enable row level security;

-- messages: owner full access
create policy messages_owner_all on public.messages for all to authenticated
  using  (public.is_owner_operator())
  with check (public.is_owner_operator());

-- messages: cleaner reads/writes their own conversation
create policy messages_cleaner_select on public.messages for select to authenticated
  using (cleaner_id = public.current_cleaner_id());
create policy messages_cleaner_insert on public.messages for insert to authenticated
  with check (cleaner_id = public.current_cleaner_id() and sender_role = 'cleaner');

-- push_subscriptions: cleaner manages their own row
create policy push_subs_cleaner_all on public.push_subscriptions for all to authenticated
  using  (cleaner_id = public.current_cleaner_id())
  with check (cleaner_id = public.current_cleaner_id());
-- owner can read (to send pushes) and delete (to clean up expired subs)
create policy push_subs_owner_read   on public.push_subscriptions for select to authenticated
  using (public.is_owner_operator());
create policy push_subs_owner_delete on public.push_subscriptions for delete to authenticated
  using (public.is_owner_operator());

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Required for the Supabase browser client subscriptions in ChatsClient / ChatListener
alter publication supabase_realtime add table public.messages;
