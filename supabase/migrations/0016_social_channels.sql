-- Extend sms_conversations to also handle Messenger + Instagram DMs.
-- The SMS bot stays on customer_phone; new social conversations key on
-- (channel, external_user_id) where external_user_id is the FB PSID
-- or IG IGSID.

alter table public.sms_conversations alter column customer_phone drop not null;

alter table public.sms_conversations drop constraint if exists sms_conversations_customer_phone_key;

alter table public.sms_conversations
  add column if not exists channel text not null default 'sms';

alter table public.sms_conversations
  drop constraint if exists sms_conversations_channel_check;
alter table public.sms_conversations
  add constraint sms_conversations_channel_check
  check (channel in ('sms','messenger','instagram'));

alter table public.sms_conversations
  add column if not exists external_user_id text;

alter table public.sms_conversations
  add column if not exists external_user_handle text;

create unique index if not exists sms_conversations_phone_unique
  on public.sms_conversations(customer_phone)
  where channel = 'sms' and customer_phone is not null;

create unique index if not exists sms_conversations_external_unique
  on public.sms_conversations(channel, external_user_id)
  where external_user_id is not null;

create index if not exists sms_conversations_channel_idx
  on public.sms_conversations(channel);

-- Outbound + inbound message identifiers vary by provider. Keep twilio_sid
-- for SMS (already populated) and add a generic provider_message_id for
-- Messenger/Instagram message IDs returned by the Send API.
alter table public.sms_messages
  add column if not exists provider_message_id text;

create index if not exists sms_messages_provider_idx
  on public.sms_messages(provider_message_id)
  where provider_message_id is not null;
