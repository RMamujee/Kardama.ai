-- Add 'cancelled' status so payments can be voided when a booking is declined/cancelled
alter type public.payment_status add value if not exists 'cancelled';
-- Allow intake-form payments that don't have a customer row yet
alter table public.payments alter column customer_id drop not null;
