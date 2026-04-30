-- Seed cleaners, customers, and today's jobs for LA South Bay.
-- All coordinates are accurate GPS positions.
-- Safe to re-run — upserts on conflict.

-- ── Cleaners ──────────────────────────────────────────────────────────────────
INSERT INTO public.cleaners (
  id, name, initials, phone, email, rating, total_jobs,
  current_lat, current_lng, home_area_name, home_area_lat, home_area_lng,
  status, available_hours, specialties, reliability_score, team_id, color
) VALUES
  -- Team A — Redondo Beach
  ('c1','Cleaner 1','C1','(310) 555-0101','cleaner1@kardama.ai',4.9,187,
   33.8490,-118.3880,'Redondo Beach',33.8490,-118.3880,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','deep-clean']::public.service_specialty[],98,'team-a','#5EEAD4'),

  ('c2','Cleaner 2','C2','(310) 555-0102','cleaner2@kardama.ai',4.8,143,
   33.8530,-118.3840,'Redondo Beach',33.8530,-118.3840,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','airbnb']::public.service_specialty[],96,'team-a','#34D399'),

  -- Team B — Long Beach
  ('c3','Cleaner 3','C3','(562) 555-0103','cleaner3@kardama.ai',4.7,112,
   33.7700,-118.1930,'Long Beach',33.7700,-118.1930,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','move-out']::public.service_specialty[],94,'team-b','#F472B6'),

  ('c4','Cleaner 4','C4','(562) 555-0104','cleaner4@kardama.ai',4.9,156,
   33.7730,-118.1970,'Long Beach',33.7730,-118.1970,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['deep-clean','post-construction']::public.service_specialty[],97,'team-b','#60A5FA'),

  -- Team C — Hawthorne/Lawndale
  ('c5','Cleaner 5','C5','(310) 555-0105','cleaner5@kardama.ai',4.6,89,
   33.8360,-118.3400,'Hawthorne',33.8360,-118.3400,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','airbnb']::public.service_specialty[],91,'team-c','#A78BFA'),

  ('c6','Cleaner 6','C6','(310) 555-0106','cleaner6@kardama.ai',4.8,134,
   33.8400,-118.3440,'Hawthorne',33.8400,-118.3440,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','deep-clean']::public.service_specialty[],95,'team-c','#FB923C'),

  -- Team D — Inglewood
  ('c7','Cleaner 7','C7','(310) 555-0107','cleaner7@kardama.ai',4.7,98,
   33.9617,-118.3531,'Inglewood',33.9617,-118.3531,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','move-out']::public.service_specialty[],93,'team-d','#F87171'),

  ('c8','Cleaner 8','C8','(310) 555-0108','cleaner8@kardama.ai',4.9,201,
   33.9553,-118.3477,'Inglewood',33.9553,-118.3477,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['deep-clean','airbnb']::public.service_specialty[],99,'team-d','#4ADE80'),

  -- Team E — El Segundo
  ('c9','Cleaner 9','C9','(310) 555-0109','cleaner9@kardama.ai',4.8,167,
   33.9192,-118.4165,'El Segundo',33.9192,-118.4165,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','post-construction']::public.service_specialty[],96,'team-e','#38BDF8'),

  ('c10','Cleaner 10','C10','(310) 555-0110','cleaner10@kardama.ai',4.7,122,
   33.9256,-118.4102,'El Segundo',33.9256,-118.4102,
   'available','{"Mon":{"start":"07:30","end":"17:30"},"Tue":{"start":"07:30","end":"17:30"},"Wed":{"start":"07:30","end":"17:30"},"Thu":{"start":"07:30","end":"17:30"},"Fri":{"start":"07:30","end":"17:30"},"Sat":{"start":"07:30","end":"17:30"},"Sun":null}',
   ARRAY['standard','airbnb']::public.service_specialty[],92,'team-e','#E879F9')

ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  initials       = EXCLUDED.initials,
  email          = EXCLUDED.email,
  current_lat    = EXCLUDED.current_lat,
  current_lng    = EXCLUDED.current_lng,
  home_area_name = EXCLUDED.home_area_name,
  home_area_lat  = EXCLUDED.home_area_lat,
  home_area_lng  = EXCLUDED.home_area_lng,
  team_id        = EXCLUDED.team_id,
  color          = EXCLUDED.color,
  status         = EXCLUDED.status;

-- ── Customers ─────────────────────────────────────────────────────────────────
INSERT INTO public.customers (id, name, phone, email, address, lat, lng, city, source, notes)
VALUES
  ('cust-live-01','Customer 1', '(310) 000-0001','customer1@private.local','1425 Artesia Blvd, Torrance, CA 90504',       33.8696,-118.3534,'Torrance',    'referral','Please use unscented products'),
  ('cust-live-02','Customer 2', '(310) 000-0002','customer2@private.local','3250 Sepulveda Blvd, Torrance, CA 90503',     33.8527,-118.3563,'Torrance',    'yelp',    'Dog in backyard — ignore barking'),
  ('cust-live-03','Customer 3', '(310) 000-0003','customer3@private.local','2401 E 7th St, Long Beach, CA 90804',         33.7669,-118.1694,'Long Beach',  'facebook','Gate code: 4821'),
  ('cust-live-04','Customer 4', '(562) 000-0004','customer4@private.local','900 E Ocean Blvd, Long Beach, CA 90802',      33.7626,-118.1877,'Long Beach',  'referral','Leave key under mat after'),
  ('cust-live-05','Customer 5', '(310) 000-0005','customer5@private.local','4444 W 168th St, Lawndale, CA 90260',         33.8848,-118.3533,'Lawndale',   'yelp',    ''),
  ('cust-live-06','Customer 6', '(310) 000-0006','customer6@private.local','3300 Sepulveda Blvd, Manhattan Beach, CA 90266',33.8862,-118.3943,'Manhattan Beach','repeat','Monthly deep-clean regular'),
  ('cust-live-07','Customer 7', '(310) 000-0007','customer7@private.local','830 S Prairie Ave, Inglewood, CA 90301',      33.9548,-118.3388,'Inglewood',  'facebook',''),
  ('cust-live-08','Customer 8', '(310) 000-0008','customer8@private.local','400 S La Brea Ave, Inglewood, CA 90301',      33.9604,-118.3457,'Inglewood',  'yelp',    'Buzz apartment 3B'),
  ('cust-live-09','Customer 9', '(310) 000-0009','customer9@private.local','531 N Sepulveda Blvd, El Segundo, CA 90245', 33.9285,-118.4155,'El Segundo', 'referral','Weekly standard service'),
  ('cust-live-10','Customer 10','(310) 000-0010','customer10@private.local','1600 Rosecrans Ave, Manhattan Beach, CA 90266',33.8862,-118.3928,'Manhattan Beach','repeat','Has 3 cats')

ON CONFLICT (id) DO UPDATE SET
  name    = EXCLUDED.name,
  phone   = EXCLUDED.phone,
  email   = EXCLUDED.email,
  address = EXCLUDED.address,
  lat     = EXCLUDED.lat,
  lng     = EXCLUDED.lng;

-- ── Today's Jobs ──────────────────────────────────────────────────────────────
DELETE FROM public.jobs WHERE id LIKE 'seed-%';

INSERT INTO public.jobs (
  id, customer_id, cleaner_ids, scheduled_date, scheduled_time,
  estimated_duration, status, service_type, price, paid, address, lat, lng,
  notes, drive_time_minutes
) VALUES
  ('seed-job-a1','cust-live-01',ARRAY['c1','c2'],CURRENT_DATE,'09:00',120,'confirmed','standard',  175.00,false,'1425 Artesia Blvd, Torrance, CA 90504',       33.8696,-118.3534,'',18),
  ('seed-job-a2','cust-live-02',ARRAY['c1','c2'],CURRENT_DATE,'11:30',90, 'scheduled','deep',      225.00,false,'3250 Sepulveda Blvd, Torrance, CA 90503',     33.8527,-118.3563,'',12),
  ('seed-job-b1','cust-live-03',ARRAY['c3','c4'],CURRENT_DATE,'09:00',90, 'confirmed','standard',  150.00,false,'2401 E 7th St, Long Beach, CA 90804',         33.7669,-118.1694,'Gate code: 4821',20),
  ('seed-job-b2','cust-live-04',ARRAY['c3','c4'],CURRENT_DATE,'11:00',120,'scheduled','airbnb',    200.00,false,'900 E Ocean Blvd, Long Beach, CA 90802',      33.7626,-118.1877,'',15),
  ('seed-job-c1','cust-live-05',ARRAY['c5','c6'],CURRENT_DATE,'09:00',120,'confirmed','standard',  175.00,false,'4444 W 168th St, Lawndale, CA 90260',         33.8848,-118.3533,'',10),
  ('seed-job-c2','cust-live-06',ARRAY['c5','c6'],CURRENT_DATE,'11:30',150,'scheduled','deep',      275.00,false,'3300 Sepulveda Blvd, Manhattan Beach, CA 90266',33.8862,-118.3943,'Monthly regular',22),
  ('seed-job-d1','cust-live-07',ARRAY['c7','c8'],CURRENT_DATE,'09:00',90, 'confirmed','standard',  150.00,false,'830 S Prairie Ave, Inglewood, CA 90301',      33.9548,-118.3388,'',8),
  ('seed-job-d2','cust-live-08',ARRAY['c7','c8'],CURRENT_DATE,'11:00',120,'scheduled','deep',      225.00,false,'400 S La Brea Ave, Inglewood, CA 90301',      33.9604,-118.3457,'Buzz 3B',14),
  ('seed-job-e1','cust-live-09',ARRAY['c9','c10'],CURRENT_DATE,'09:00',60, 'confirmed','standard', 125.00,false,'531 N Sepulveda Blvd, El Segundo, CA 90245', 33.9285,-118.4155,'Weekly service',5),
  ('seed-job-e2','cust-live-10',ARRAY['c9','c10'],CURRENT_DATE,'10:30',120,'scheduled','standard', 175.00,false,'1600 Rosecrans Ave, Manhattan Beach, CA 90266',33.8862,-118.3928,'Has 3 cats',18);
