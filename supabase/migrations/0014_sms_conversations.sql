-- SMS conversations + per-message log for the AI customer agent.
-- The AI replies autonomously by default. The owner can take over a thread
-- from the dashboard, which flips `mode` to 'human' and silences the AI for
-- a cooldown window. Hard escalations from the AI flip `mode` to 'escalated'
-- and trigger a push to the owner.

-- ───────────────────────────── enums ─────────────────────────────
create type public.sms_mode      as enum ('auto', 'human', 'escalated');
create type public.sms_direction as enum ('inbound', 'outbound');
create type public.sms_sender    as enum ('customer', 'ai', 'owner');

-- ───────────────────────────── tables ─────────────────────────────
-- One row per customer phone number. customer_id may be null for cold
-- inbound texts (someone we've never seen). Phones are stored E.164.
create table public.sms_conversations (
  id                 uuid primary key default gen_random_uuid(),
  customer_phone     text not null unique,
  customer_id        text references public.customers(id) on delete set null,
  mode               public.sms_mode not null default 'auto',
  human_takeover_at  timestamptz,
  escalation_reason  text,
  last_message_at    timestamptz not null default now(),
  unread_count       int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index sms_conversations_customer_idx     on public.sms_conversations(customer_id);
create index sms_conversations_last_message_idx on public.sms_conversations(last_message_at desc);
create index sms_conversations_mode_idx         on public.sms_conversations(mode)
  where mode != 'auto';

-- Every individual SMS, both directions. ai_tools_used captures the function
-- calls the AI made when generating an outbound reply, so the owner can audit
-- what the agent actually did (booked a job, quoted a price, etc.).
create table public.sms_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.sms_conversations(id) on delete cascade,
  direction       public.sms_direction not null,
  sender          public.sms_sender not null,
  body            text not null,
  twilio_sid      text,
  ai_tools_used   jsonb,
  created_at      timestamptz not null default now()
);
create index sms_messages_conversation_idx on public.sms_messages(conversation_id, created_at);

-- Inbound message must come from the customer; outbound from ai or owner.
alter table public.sms_messages add constraint sms_messages_direction_sender_match check (
  (direction = 'inbound'  and sender = 'customer') or
  (direction = 'outbound' and sender in ('ai', 'owner'))
);

-- ───────────────────────────── triggers ─────────────────────────────
-- Bump conversation timestamps + unread count whenever a new message lands.
create or replace function public.sms_messages_bump_conversation()
returns trigger language plpgsql as $$
begin
  update public.sms_conversations
     set last_message_at = NEW.created_at,
         unread_count    = case
                             when NEW.direction = 'inbound' then unread_count + 1
                             else unread_count
                           end,
         updated_at      = now()
   where id = NEW.conversation_id;
  return NEW;
end;
$$;

create trigger sms_messages_bump_conversation_trg
  after insert on public.sms_messages
  for each row execute function public.sms_messages_bump_conversation();

create trigger sms_conversations_set_updated_at
  before update on public.sms_conversations
  for each row execute function public.set_updated_at();

-- ───────────────────────────── RLS ─────────────────────────────
alter table public.sms_conversations enable row level security;
alter table public.sms_messages      enable row level security;

-- Owner-only access (the inbound webhook writes via service role, which
-- bypasses RLS, so cleaners and anonymous users can't read SMS history).
create policy sms_conversations_owner_all on public.sms_conversations for all to authenticated
  using  (public.is_owner_operator())
  with check (public.is_owner_operator());

create policy sms_messages_owner_all on public.sms_messages for all to authenticated
  using  (public.is_owner_operator())
  with check (public.is_owner_operator());

-- ───────────────────────────── realtime ─────────────────────────────
-- The owner SMS inbox UI subscribes to both tables for live thread updates
-- and unread-badge bumps without polling.
alter publication supabase_realtime add table public.sms_conversations;
alter publication supabase_realtime add table public.sms_messages;
