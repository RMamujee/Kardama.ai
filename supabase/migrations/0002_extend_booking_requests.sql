-- Extend booking_requests to absorb the public intake form fields.
-- Replaces the now-removed KardamaIntake `intake_submissions` table.

alter table public.booking_requests
  add column if not exists unit                    text,
  add column if not exists home_size               text,
  add column if not exists cleaning_frequency      text,
  add column if not exists preferred_days          text[] not null default '{}',
  add column if not exists preferred_arrival_times text[] not null default '{}',
  add column if not exists preferred_exit_times    text[] not null default '{}',
  add column if not exists has_pets_allergies      text;

drop table if exists public.intake_submissions;
