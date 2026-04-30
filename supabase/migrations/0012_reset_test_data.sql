-- Reset transactional tables for clean testing.
-- Keeps: cleaners, teams, profiles, auth users.
-- Clears: customers, jobs, payments, booking_requests, social_leads, messages.
-- Safe to run any time you want a fresh test slate.

truncate table public.payments         restart identity cascade;
truncate table public.jobs             restart identity cascade;
truncate table public.booking_requests restart identity cascade;
truncate table public.customers        restart identity cascade;
truncate table public.social_leads     restart identity cascade;
truncate table public.messages         restart identity cascade;
