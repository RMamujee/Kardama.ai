<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kardama project notes

## Stack
- Next.js 16 (uses `proxy.ts` instead of `middleware.ts`; `cookies()` is async)
- Supabase (Auth + Postgres + RLS) via Vercel Marketplace
- Tailwind 4, Radix UI, Zustand, framer-motion, Twilio, Leaflet
- Targets Vercel; daily cron in `vercel.json`

## Auth & roles
Two roles in `public.profiles.role`:
- `owner_operator` — full owner dashboard at `(dashboard)/*`
- `cleaner` ("maid") — personal dashboard at `(cleaner)/me`

Auth enforced in three places:
1. `src/proxy.ts` — refreshes Supabase cookies on every request, redirects unauthed users from protected routes, role-gates `/dashboard` vs `/me`.
2. `src/lib/supabase/dal.ts` — `requireOwner()` / `requireCleaner()` called from each Server Component / Server Action.
3. Postgres RLS policies in `supabase/migrations/0001_init.sql` — defence-in-depth.

## Data layer
- `src/lib/data/index.ts` is the server-side data layer. It returns the existing camelCase domain types (`Cleaner`, `Customer`, `Job`, `Payment`).
- Falls back to `src/lib/mock-data.ts` when Supabase env vars are missing — keeps the app bootable before Marketplace setup is complete.
- Pages that need data should be Server Components that call the data layer and pass props to a `*-client.tsx` Client Component.

## Pages migrated to Supabase
- `(dashboard)/dashboard` — KPIs, today's jobs, team status
- `(dashboard)/customers` — customer list + detail panel
- `(dashboard)/team` — team management + invite-cleaner action
- `(cleaner)/me` — cleaner's personal job list

## Pages still on mock data (TODO)
The following still import from `@/lib/mock-data`. The mechanical migration: rename `page.tsx` → `*-client.tsx`, accept data as props, write a thin Server Component `page.tsx` that calls `getCleaners()` / `getJobs()` / etc. from `@/lib/data`.
- `(dashboard)/scheduling`
- `(dashboard)/payments`
- `(dashboard)/messages`
- `(dashboard)/campaigns`
- `(dashboard)/analytics`
- `components/map/LiveMapView.tsx`
- `components/scheduling/BookingWizard.tsx`
- `components/payments/LogPaymentModal.tsx`
- `store/use*Store.ts` — Zustand stores still hydrate from mock data
- `app/api/bookings/*` — token-based rebooking flow uses file-based `booking-store.ts`; replace with a `bookings` table when ready
- `app/api/sms/*`, `app/api/campaigns/*`, `app/api/marketing/*` — campaign engines still simulate; needs separate design

## Booking_requests table
A `booking_requests` table exists for public new-customer signups, but no public form is wired yet. When you build a "Get a quote" form, post it to a new route that inserts into `booking_requests` (anonymous insert is allowed by RLS).

## Local dev workflow
1. Provision Supabase via Vercel Marketplace; pull env vars: `vercel env pull .env.local`
2. Apply migrations: paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor (or use the Supabase CLI: `supabase db push`)
3. Seed: `npm run db:seed`
4. Create the first owner: see "Bootstrapping the first owner" below
5. `npm run dev`

## Bootstrapping the first owner
RLS prevents an anonymous user from making themselves an owner. Use the Supabase dashboard:
1. Authentication → Users → "Add user" → email + password
2. Database → SQL editor:
   ```sql
   insert into public.profiles (user_id, role, display_name)
   values ('<paste-the-uuid>', 'owner_operator', 'Owner');
   ```
3. Sign in at `/login`

After that, the owner can invite cleaners from the `/team` page.

## Required env vars
- `NEXT_PUBLIC_SUPABASE_URL` — auto-set by Vercel Marketplace
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — auto-set by Vercel Marketplace
- `SUPABASE_SERVICE_ROLE_KEY` — auto-set by Vercel Marketplace; service-role client uses this for inviting cleaners and seeding
- `NEXT_PUBLIC_SITE_URL` — set to `https://your-domain.com` in production so invite emails redirect correctly
