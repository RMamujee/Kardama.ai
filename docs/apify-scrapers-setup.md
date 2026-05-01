# Lead source scrapers — setup guide

Four n8n workflows pull leads from external sources and POST them into the dashboard's `social_leads` table. They show up in **Marketing → Lead Monitor** alongside the existing Vercel-cron Facebook Groups scanner.

Two use **official APIs** (cheaper, more stable). Two use **Apify** (no API exists for keyword/hashtag discovery on those platforms).

## What got built

**n8n workflows (in the Kardama project — `U0Uez4IOfJBxS1Hf`):**

| Workflow | Source | Workflow ID | Webhook path | Cron |
|---|---|---|---|---|
| Google Maps | Google Places API v1 | `Km05IXoa9DGrBrNT` | `/webhook/kardama/scraper/google-maps` | daily 8:00 |
| Yelp | Yelp Fusion API | `JKHiZBPebpUMhP4I` | `/webhook/kardama/scraper/yelp` | daily 8:15 |
| Instagram | Apify `apify/instagram-hashtag-scraper` | `QkzmYEp96klWAadB` | `/webhook/kardama/scraper/instagram` | daily 8:30 |
| Facebook Pages | Apify `apify/facebook-pages-scraper` | `sTfL9ybMCF67GFjt` | `/webhook/kardama/scraper/facebook-pages` | daily 8:45 |

Each workflow has the same shape:

```
Schedule (daily) ─┐
                  ├─► Defaults → Call API/actor → Build Lead Payloads → POST /api/leads
Webhook ──────────┘
```

**Dashboard:**

- `supabase/migrations/0015_extend_lead_platforms.sql` — adds `google-maps` and `yelp` to the platform check
- `src/types/social.ts` + `database.types.ts` — extended `LeadPlatform`
- `src/components/marketing/LeadMonitor.tsx` — added platform config + filter pills
- `src/components/marketing/ScraperPanel.tsx` — new "Run now" UI on the Lead Monitor tab
- `src/app/api/leads/trigger/route.ts` — owner-only proxy that fires the matching n8n webhook
- `src/app/api/leads/route.ts` — POST upgraded to upsert on `external_id` so daily reruns don't 500

## One-time setup

### 1. Get API keys

| Source | Where | Cost |
|---|---|---|
| **Google Places API** | https://console.cloud.google.com → APIs & Services → enable "Places API (New)" → Credentials → Create API key. Restrict to "Places API". | $200/mo free credit covers ~6k Text Search calls |
| **Yelp Fusion API** | https://docs.developer.yelp.com → Create App → API Key | Free up to 5K calls/day |
| **Apify token** | https://apify.com/account/integrations → Personal API tokens | Pay-as-you-go (~$0.06–0.15 per run) |

### 2. Configure n8n credentials

In n8n → **Credentials → Add credential** (one of each, reused across the matching workflows):

**Google Places API Key (X-Goog-Api-Key)** — type **Header Auth** → name `X-Goog-Api-Key`, value `<your Places key>`. Used by the Google Maps workflow.

**Yelp Fusion API Key (Bearer)** — type **Bearer Auth** → value `<your Yelp Fusion key>`. Used by the Yelp workflow.

**Apify Token (token query param)** — type **Query Auth** → name `token`, value `<your Apify token>`. Used by the Instagram + Facebook Pages workflows.

**Kardama CRON_SECRET (Authorization: Bearer ...)** — type **Header Auth** → name `Authorization`, value `Bearer <CRON_SECRET>` (must match the dashboard's `CRON_SECRET` env). Used by **all four** workflows for the final POST to `/api/leads`.

Open each workflow → click each HTTP Request node → pick the matching credential → save → toggle **Active**.

### 3. Vercel env vars (already set on `kardama-ai` production)

```
N8N_SCRAPER_GOOGLE_MAPS_WEBHOOK_URL    = https://kardama.app.n8n.cloud/webhook/kardama/scraper/google-maps
N8N_SCRAPER_YELP_WEBHOOK_URL           = https://kardama.app.n8n.cloud/webhook/kardama/scraper/yelp
N8N_SCRAPER_INSTAGRAM_WEBHOOK_URL      = https://kardama.app.n8n.cloud/webhook/kardama/scraper/instagram
N8N_SCRAPER_FACEBOOK_PAGES_WEBHOOK_URL = https://kardama.app.n8n.cloud/webhook/kardama/scraper/facebook-pages
```

`CRON_SECRET` is already set on the dashboard (also used by `/api/leads/scan`). The same value goes into the n8n Header Auth credential above.

### 4. Smoke test

1. Open `kardama-ai.vercel.app/marketing` → Lead Monitor → "Lead Sources" panel.
2. Type a city + keyword, hit **Run now** on Google Maps.
3. Watch the n8n execution; results post to `/api/leads`.
4. Click **Refresh** on the lead monitor — new rows with platform `google-maps` should appear.

## Cost expectations

- **Google Maps (Places API)**: ~$32 per 1k Text Search calls; 30 results per call. With $200/mo free credit, ~6k searches free.
- **Yelp (Fusion API)**: free up to 5K calls/day.
- **Instagram (Apify)**: ~$0.06 per run @ 30 posts.
- **Facebook Pages (Apify)**: ~$0.15 per run @ 30 pages.

Daily schedules + occasional manual runs ≈ ~$5–10/month total at low volume.

## Known limits

- **Yelp Fusion** caps at 50 results per query and doesn't return reviews (use the GraphQL endpoint if you need richer data later).
- **Google Places Text Search** returns up to 20 by default, 60 max via paging — current workflow uses a single page.
- **Facebook Pages without cookies** — public pages work; private return less. If needed, add `cookies` JSON to the actor input via env or workflow input.
- **Dedup is by `external_id`.** `/api/leads` POST upserts on conflict, so daily reruns are safe.
