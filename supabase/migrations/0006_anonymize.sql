-- One-time migration to anonymize all cleaner and customer names in the live DB.
-- Safe to re-run — updates are idempotent by ID.

-- ── Seed cleaners (by ID) ─────────────────────────────────────────────────────
UPDATE public.cleaners SET name='Bigfoot 1', initials='BF1', email='bigfoot1@kardama.ai' WHERE id='c1';
UPDATE public.cleaners SET name='Bigfoot 2', initials='BF2', email='bigfoot2@kardama.ai' WHERE id='c2';
UPDATE public.cleaners SET name='Profane 1', initials='P1',  email='profane1@kardama.ai' WHERE id='c3';
UPDATE public.cleaners SET name='Profane 2', initials='P2',  email='profane2@kardama.ai' WHERE id='c4';
UPDATE public.cleaners SET name='Gypsy 1',   initials='GY1', email='gypsy1@kardama.ai'   WHERE id='c5';
UPDATE public.cleaners SET name='Gypsy 2',   initials='GY2', email='gypsy2@kardama.ai'   WHERE id='c6';
UPDATE public.cleaners SET name='Angle 1',   initials='AN1', email='angle1@kardama.ai'   WHERE id='c7';
UPDATE public.cleaners SET name='Angle 2',   initials='AN2', email='angle2@kardama.ai'   WHERE id='c8';
UPDATE public.cleaners SET name='Gamma 1',   initials='GM1', email='gamma1@kardama.ai'   WHERE id='c9';
UPDATE public.cleaners SET name='Gamma 2',   initials='GM2', email='gamma2@kardama.ai'   WHERE id='c10';

-- ── Real cleaner accounts ─────────────────────────────────────────────────────
UPDATE public.cleaners SET name='Profane 2', initials='P2', email='profane2.real@kardama.ai' WHERE id='c_jalen';
UPDATE public.cleaners SET name='Profane 1', initials='P1', email='profane1@kardama.ai'
  WHERE LOWER(name) LIKE '%dev%cleaner%' OR LOWER(name) = 'dev cleaner';

-- ── Customers (sequential by created_at) ─────────────────────────────────────
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM public.customers
)
UPDATE public.customers c
SET
  name  = 'Customer ' || n.rn,
  email = 'customer' || n.rn || '@private.local',
  phone = '(000) 000-' || LPAD(n.rn::text, 4, '0')
FROM numbered n
WHERE c.id = n.id;
