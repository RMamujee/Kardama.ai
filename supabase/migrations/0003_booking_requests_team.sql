alter table public.booking_requests
  add column if not exists assigned_team integer check (assigned_team between 1 and 5),
  add column if not exists payment_method text,
  add column if not exists calendar_event_id text;
