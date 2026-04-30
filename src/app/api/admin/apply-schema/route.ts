import { NextResponse } from 'next/server'
import { Pool } from 'pg'

// POST /api/admin/apply-schema
// Runs all schema DDL — creates/alters tables, indexes, RLS policies.
// Does NOT insert any seed or test data.
// Safe to call multiple times — all DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
// Requires POSTGRES_URL_NON_POOLING (auto-set by Vercel Marketplace).

// Each entry is run as a separate query so errors are isolated and reported.
// ALTER TYPE ... ADD VALUE cannot run inside a transaction, so it's first.
const DDL_STEPS: Array<{ label: string; sql: string }> = [
  {
    label: 'enum: payment_status += cancelled',
    sql: `ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled'`,
  },
  {
    label: 'booking_requests: extend columns',
    sql: `
      ALTER TABLE public.booking_requests
        ADD COLUMN IF NOT EXISTS unit                    text,
        ADD COLUMN IF NOT EXISTS home_size               text,
        ADD COLUMN IF NOT EXISTS cleaning_frequency      text,
        ADD COLUMN IF NOT EXISTS preferred_days          text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS preferred_arrival_times text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS preferred_exit_times    text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS has_pets_allergies      text,
        ADD COLUMN IF NOT EXISTS assigned_team           integer CHECK (assigned_team BETWEEN 1 AND 5),
        ADD COLUMN IF NOT EXISTS payment_method          text,
        ADD COLUMN IF NOT EXISTS calendar_event_id       text
    `,
  },
  {
    label: 'payments: nullable job_id',
    sql: `ALTER TABLE public.payments ALTER COLUMN job_id DROP NOT NULL`,
  },
  {
    label: 'payments: nullable method',
    sql: `ALTER TABLE public.payments ALTER COLUMN method DROP NOT NULL`,
  },
  {
    label: 'payments: nullable customer_id',
    sql: `ALTER TABLE public.payments ALTER COLUMN customer_id DROP NOT NULL`,
  },
  {
    label: 'payments: add booking_ref',
    sql: `ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS booking_ref text`,
  },
  {
    label: 'social_leads: create table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.social_leads (
        id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        platform       text        NOT NULL CHECK (platform IN ('facebook-group','facebook-page','instagram','nextdoor','messenger')),
        author         text        NOT NULL,
        author_initials text       NOT NULL DEFAULT '',
        group_or_page  text        NOT NULL DEFAULT '',
        content        text        NOT NULL,
        posted_at      timestamptz NOT NULL DEFAULT now(),
        status         text        NOT NULL DEFAULT 'new' CHECK (status IN ('new','responded','captured','dismissed')),
        location       text        NOT NULL DEFAULT '',
        urgency        text        NOT NULL DEFAULT 'medium' CHECK (urgency IN ('high','medium','low')),
        responded_at   timestamptz,
        response_used  text,
        captured_at    timestamptz,
        likes          int         NOT NULL DEFAULT 0,
        comments_count int         NOT NULL DEFAULT 0,
        external_id    text        UNIQUE,
        messenger_psid text,
        raw_data       jsonb,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `,
  },
  {
    label: 'social_leads: indexes + RLS',
    sql: `
      CREATE INDEX IF NOT EXISTS social_leads_status_idx    ON public.social_leads(status);
      CREATE INDEX IF NOT EXISTS social_leads_posted_at_idx ON public.social_leads(posted_at DESC);
      CREATE INDEX IF NOT EXISTS social_leads_platform_idx  ON public.social_leads(platform);
      ALTER TABLE public.social_leads ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='social_leads' AND policyname='owner_operator can manage social_leads') THEN
          CREATE POLICY "owner_operator can manage social_leads" ON public.social_leads FOR ALL
            USING  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='owner_operator'))
            WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='owner_operator'));
        END IF;
      END $$;
      CREATE OR REPLACE FUNCTION public.handle_social_leads_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN new.updated_at = now(); RETURN new; END; $fn$;
      CREATE OR REPLACE TRIGGER social_leads_updated_at
        BEFORE UPDATE ON public.social_leads
        FOR EACH ROW EXECUTE PROCEDURE public.handle_social_leads_updated_at();
    `,
  },
  {
    label: 'daily_routes: create table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.daily_routes (
        id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id         text         NOT NULL,
        route_date      date         NOT NULL,
        stop_order      jsonb        NOT NULL DEFAULT '[]',
        segments        jsonb        NOT NULL DEFAULT '[]',
        legs            jsonb        NOT NULL DEFAULT '[]',
        total_drive_min int          NOT NULL DEFAULT 0,
        total_km        numeric(6,1) NOT NULL DEFAULT 0,
        computed_at     timestamptz  NOT NULL DEFAULT now(),
        UNIQUE (team_id, route_date)
      );
      ALTER TABLE public.daily_routes ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_routes' AND policyname='owners full') THEN
          CREATE POLICY "owners full" ON public.daily_routes FOR ALL
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='owner_operator'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_routes' AND policyname='cleaners read own team') THEN
          CREATE POLICY "cleaners read own team" ON public.daily_routes FOR SELECT
            USING (EXISTS (
              SELECT 1 FROM public.cleaners c
              JOIN public.profiles p ON p.cleaner_id=c.id
              WHERE p.user_id=auth.uid() AND c.team_id=daily_routes.team_id
            ));
        END IF;
      END $$;
    `,
  },
  {
    label: 'messages: create table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.messages (
        id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        cleaner_id  text        NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
        sender_role text        NOT NULL CHECK (sender_role IN ('owner','cleaner')),
        content     text        NOT NULL,
        read_at     timestamptz,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS messages_cleaner_id_idx ON public.messages(cleaner_id);
      CREATE INDEX IF NOT EXISTS messages_created_at_idx  ON public.messages(created_at);
      ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_owner_all') THEN
          CREATE POLICY messages_owner_all ON public.messages FOR ALL TO authenticated
            USING (public.is_owner_operator()) WITH CHECK (public.is_owner_operator());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_cleaner_select') THEN
          CREATE POLICY messages_cleaner_select ON public.messages FOR SELECT TO authenticated
            USING (cleaner_id = public.current_cleaner_id());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_cleaner_insert') THEN
          CREATE POLICY messages_cleaner_insert ON public.messages FOR INSERT TO authenticated
            WITH CHECK (cleaner_id = public.current_cleaner_id() AND sender_role = 'cleaner');
        END IF;
      END $$;
    `,
  },
  {
    label: 'push_subscriptions: create table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.push_subscriptions (
        id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        cleaner_id   text        NOT NULL UNIQUE REFERENCES public.cleaners(id) ON DELETE CASCADE,
        subscription jsonb       NOT NULL,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='push_subs_cleaner_all') THEN
          CREATE POLICY push_subs_cleaner_all ON public.push_subscriptions FOR ALL TO authenticated
            USING (cleaner_id = public.current_cleaner_id())
            WITH CHECK (cleaner_id = public.current_cleaner_id());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='push_subs_owner_read') THEN
          CREATE POLICY push_subs_owner_read ON public.push_subscriptions FOR SELECT TO authenticated
            USING (public.is_owner_operator());
        END IF;
      END $$;
    `,
  },
  {
    label: 'teams: create table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.teams (
        id         text        PRIMARY KEY,
        name       text        NOT NULL,
        color      text        NOT NULL DEFAULT '#3b82f6',
        archived   boolean     NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name='teams_set_updated_at') THEN
          CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON public.teams
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        END IF;
      END $$;
      ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_owner_all') THEN
          CREATE POLICY teams_owner_all ON public.teams FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='owner_operator'))
            WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='owner_operator'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_read_all') THEN
          CREATE POLICY teams_read_all ON public.teams FOR SELECT TO authenticated USING (true);
        END IF;
      END $$;
    `,
  },
  {
    label: 'cleaners: add team_id FK',
    sql: `
      ALTER TABLE public.cleaners ADD COLUMN IF NOT EXISTS team_id text;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='cleaners_team_id_fkey') THEN
          UPDATE public.cleaners SET team_id='team-a'
            WHERE team_id IS NOT NULL AND team_id NOT IN (SELECT id FROM public.teams);
          ALTER TABLE public.cleaners
            ADD CONSTRAINT cleaners_team_id_fkey
            FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS cleaners_team_id_idx ON public.cleaners(team_id);
    `,
  },
  {
    label: 'jobs: add team_id column',
    sql: `
      ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS team_id text REFERENCES public.teams(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS jobs_team_id_scheduled_date_idx ON public.jobs(team_id, scheduled_date);
      UPDATE public.jobs j SET team_id = c.team_id
        FROM public.cleaners c
        WHERE j.team_id IS NULL AND array_length(j.cleaner_ids,1) > 0 AND c.id = j.cleaner_ids[1];
    `,
  },
  {
    label: 'daily_routes: add teams FK',
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='daily_routes_team_id_fkey') THEN
          ALTER TABLE public.daily_routes
            ADD CONSTRAINT daily_routes_team_id_fkey
            FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `,
  },
  {
    label: 'team_schedule: view',
    sql: `
      CREATE OR REPLACE VIEW public.team_schedule AS
        SELECT j.team_id, t.name AS team_name, t.color AS team_color,
               j.id AS job_id, j.customer_id,
               j.scheduled_date, j.scheduled_time, j.estimated_duration,
               j.status, j.service_type, j.address, j.cleaner_ids
        FROM public.jobs j
        JOIN public.teams t ON t.id = j.team_id;
    `,
  },
  {
    label: 'realtime: add messages + daily_routes',
    sql: `
      DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;      EXCEPTION WHEN others THEN NULL; END $$;
      DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_routes;  EXCEPTION WHEN others THEN NULL; END $$;
    `,
  },
]

export async function POST(request: Request) {
  const secret = process.env.SETUP_SECRET
  if (secret && request.headers.get('x-setup-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dbUrl = process.env.POSTGRES_URL_NON_POOLING
  if (!dbUrl) return NextResponse.json({ error: 'POSTGRES_URL_NON_POOLING not set' }, { status: 500 })

  const log: Array<{ step: string; status: 'ok' | 'error' | 'skipped'; detail?: string }> = []

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, max: 1 })
  const client = await pool.connect()
  try {
    for (const step of DDL_STEPS) {
      try {
        await client.query(step.sql)
        log.push({ step: step.label, status: 'ok' })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('already exists') || msg.includes('does not exist')) {
          log.push({ step: step.label, status: 'skipped', detail: msg.split('\n')[0] })
        } else {
          log.push({ step: step.label, status: 'error', detail: msg.split('\n')[0] })
        }
      }
    }
  } finally {
    client.release()
    await pool.end()
  }

  const errors = log.filter(l => l.status === 'error')
  return NextResponse.json({ ok: errors.length === 0, errors: errors.length, log }, { status: errors.length > 0 ? 207 : 200 })
}
