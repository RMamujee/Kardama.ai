-- Stores Google Directions route geometry per team per day.
-- Enables:
--   Dashboard  → fast load (no per-load Google API calls), Realtime pushes updates to all open tabs
--   Mobile     → server-side route fetch without hitting Google API on each cleaner login
--   Dispatcher → recompute button refreshes all connected clients via Realtime

CREATE TABLE public.daily_routes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         text NOT NULL,
  route_date      date NOT NULL,
  -- Ordered stops: [{jobId, lat, lng, address, scheduledTime}]
  stop_order      jsonb NOT NULL DEFAULT '[]',
  -- Google Directions per-leg geometry: [{positions: [[lat,lng],...], congestion: 'clear'|'moderate'|'heavy'}]
  segments        jsonb NOT NULL DEFAULT '[]',
  -- Per-leg metrics: [{durationMin, distanceKm, traffic}]
  legs            jsonb NOT NULL DEFAULT '[]',
  total_drive_min int   NOT NULL DEFAULT 0,
  total_km        numeric(6,1) NOT NULL DEFAULT 0,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, route_date)
);

ALTER TABLE public.daily_routes ENABLE ROW LEVEL SECURITY;

-- Owners have full CRUD
CREATE POLICY "owners full" ON public.daily_routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'owner_operator'
    )
  );

-- Cleaners can read their own team's route
CREATE POLICY "cleaners read own team" ON public.daily_routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      JOIN public.profiles p ON p.cleaner_id = c.id
      WHERE p.user_id = auth.uid() AND c.team_id = daily_routes.team_id
    )
  );

-- Realtime: push route updates to all connected dashboard + mobile clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_routes;
