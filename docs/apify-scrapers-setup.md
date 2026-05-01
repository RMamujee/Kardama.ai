# Apify scrapers — setup guide

Four n8n workflows scrape leads from Apify and POST them into the dashboard's `social_leads` table. They show up in **Marketing → Lead Monitor** alongside the existing Vercel-cron Facebook Groups scanner.

## What got built

**n8n workflows (in the Kardama project — `U0Uez4IOfJBxS1Hf`):**

| Workflow | ID | Webhook path | Cron |
|---|---|---|---|
| Google Maps | `Km05IXoa9DGrBrNT` | `/webhook/kardama/scraper/google-maps` | daily 8:00 |
| Yelp | `JKHiZBPebpUMhP4I` | `/webhook/kardama/scraper/yelp` | daily 8:15 |
| Instagram | `QkzmYEp96klWAadB` | `/webhook/kardama/scraper/instagram` | daily 8:30 |
| Facebook Pages | `sTfL9ybMCF67GFjt` | `/webhook/kardama/scraper/facebook-pages` | daily 8:45 |

Each workflow has the same shape:

```
Schedule (daily) ─┐
                  ├─► Defaults → Run Apify Actor → Build Lead Payloads → POST /api/leads
Webhook ──────────┘
```

**Dashboard:**

- `supabase/migrations/0015_extend_lead_platforms.sql` — adds `google-maps` and `yelp` to the platform check constraint
- `src/types/social.ts` — extended `LeadPlatform`
- `src/components/marketing/LeadMonitor.tsx` — added platform config + filter pills
- `src/components/marketing/ScraperPanel.tsx` — new "Run now" UI
- `src/app/api/leads/trigger/route.ts` — owner-only proxy that fires the matching n8n webhook

## One-time setup

### 1. Apply the migration

Paste `supabase/migrations/0015_extend_lead_platforms.sql` into the Supabase SQL editor (project `ovjarxyxkjfochokhmwo`).

### 2. Configure n8n credentials (one of each, reused across all 4 workflows)

In n8n → **Credentials → Add credential**:

**Apify Token (token query param)** — type **Query Auth**
- Name: `token`
- Value: `<your Apify API token>` (from `apify.com/account/integrations`)

**Kardama CRON_SECRET (Authorization: Bearer ...)** — type **Header Auth**
- Name: `Authorization`
- Value: `Bearer <CRON_SECRET>` (must match `CRON_SECRET` in Vercel env on `kardama-ai`)

Open each of the 4 workflows. The two HTTP Request nodes ("Run Apify ..." and "POST /api/leads") will show "Select credential" — pick the matching credential above, then save and toggle the workflow **Active**.

### 3. Set Vercel env vars on `kardama-ai`

Add these 4 env vars (production + preview):

```
N8N_SCRAPER_GOOGLE_MAPS_WEBHOOK_URL    = https://kardama.app.n8n.cloud/webhook/kardama/scraper/google-maps
N8N_SCRAPER_YELP_WEBHOOK_URL           = https://kardama.app.n8n.cloud/webhook/kardama/scraper/yelp
N8N_SCRAPER_INSTAGRAM_WEBHOOK_URL      = https://kardama.app.n8n.cloud/webhook/kardama/scraper/instagram
N8N_SCRAPER_FACEBOOK_PAGES_WEBHOOK_URL = https://kardama.app.n8n.cloud/webhook/kardama/scraper/facebook-pages
```

`CRON_SECRET` is already set on the dashboard (used by `/api/leads/scan`). The same value goes into the n8n Header Auth credential above.

### 4. Smoke test

1. Open `kardama-ai.vercel.app/marketing`. Lead Monitor tab → "Apify Scrapers" panel.
2. Type a city + keyword, hit **Run now** on Google Maps.
3. Watch the n8n execution; results post to `/api/leads`.
4. Click **Refresh** on the lead monitor — new rows with platform `google-maps` should appear.

## Cost expectations (Apify)

Each manual run pulls up to 30 results by default. At Apify's typical pricing:

- Google Maps (`compass/crawler-google-places`) — ~$0.005 / place → ~$0.15 per run
- Yelp (`yin/yelp-scraper`) — ~$0.006 / business → ~$0.18 per run
- Instagram hashtag — ~$0.002 / post → ~$0.06 per run
- Facebook Pages — ~$0.005 / page → ~$0.15 per run

Daily schedules run all four = ~$0.55/day = ~$17/month + manual runs. Pay-as-you-go on the Apify side; n8n's own metered usage is separate.

## Known limits

- **Apify run-sync timeout.** The HTTP Request nodes use `timeout=120` on the Apify side and 130s client timeout. Big runs (limit > 50) on slow actors may exceed that — for those, split into smaller webhook calls or change to `runs` + dataset polling.
- **Facebook Pages without cookies.** Public pages work; private pages return less. If you need full data, add a `cookies` input to the actor request body using a Facebook session export.
- **Dedup is by `external_id`.** The existing `/api/leads` POST does not upsert (`/api/leads/scan` does). If a scraper posts the same place twice, you'll get duplicate `social_leads` rows. Consider switching the n8n POST to call a future `/api/leads/upsert` if dedup matters.
