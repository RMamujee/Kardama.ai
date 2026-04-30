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
- `src/lib/data/index.ts` is the server-side data layer. It returns camelCase domain types (`Cleaner`, `Customer`, `Job`, `Payment`) from Supabase.
- All fetchers return `[]` on error — the app shows empty states until real data exists in the DB.
- Pages that need data should be Server Components that call the data layer and pass props to a `*-client.tsx` Client Component.
- There is no mock-data fallback. `src/lib/mock-data.ts` has been deleted.

## Booking_requests table
A `booking_requests` table exists for public new-customer signups, but no public form is wired yet. When you build a "Get a quote" form, post it to a new route that inserts into `booking_requests` (anonymous insert is allowed by RLS).

## Local dev workflow
1. Provision Supabase via Vercel Marketplace; pull env vars: `vercel env pull .env.local`
2. Apply schema: paste `supabase/apply.sql` into the Supabase SQL editor, then hit `POST /api/admin/apply-schema` to finish setup.
3. Create the first owner: see "Bootstrapping the first owner" below
4. `npm run dev`

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
- `SUPABASE_SERVICE_ROLE_KEY` — auto-set by Vercel Marketplace; service-role client uses this for inviting cleaners and admin setup
- `NEXT_PUBLIC_SITE_URL` — set to `https://your-domain.com` in production so invite emails redirect correctly
