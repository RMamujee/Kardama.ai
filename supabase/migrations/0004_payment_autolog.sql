-- Payment autolog: allow payments to be created before a Supabase job exists
-- (e.g. when a booking form is submitted before the job is migrated to Supabase)
alter table public.payments alter column job_id drop not null;
-- Allow pending payments where method is not yet known (owner fills it in on confirmation)
alter table public.payments alter column method drop not null;
-- Link back to the booking that originated this payment
alter table public.payments add column if not exists booking_ref text;
