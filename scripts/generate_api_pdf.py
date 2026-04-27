"""
Generates Kardama.ai_API_Costs.pdf — the API + pricing breakdown for Kardama.ai.
Run: python scripts/generate_api_pdf.py
"""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT
from pathlib import Path
from datetime import date

OUTPUT = Path(r"C:\Users\Rahil\Documents\Kardama.ai_API_Costs.pdf")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

# ── Styles ─────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=22, spaceAfter=4,
                    textColor=colors.HexColor('#0b1220'), leading=26)
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, spaceBefore=14,
                    spaceAfter=6, textColor=colors.HexColor('#1e3a8a'), leading=18)
H3 = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=11.5, spaceBefore=8,
                    spaceAfter=2, textColor=colors.HexColor('#111827'), leading=14)
BODY = ParagraphStyle('Body', parent=styles['BodyText'], fontSize=9.5, leading=13,
                      spaceAfter=4, alignment=TA_LEFT, textColor=colors.HexColor('#222'))
SMALL = ParagraphStyle('Small', parent=BODY, fontSize=8.5, leading=11,
                       textColor=colors.HexColor('#555'))
TAG_FREE = ParagraphStyle('TagFree', parent=BODY, fontSize=8.5, leading=10,
                          textColor=colors.white, alignment=TA_LEFT)
NOTE = ParagraphStyle('Note', parent=BODY, fontSize=9, leading=12,
                      backColor=colors.HexColor('#fef9c3'),
                      borderColor=colors.HexColor('#facc15'),
                      borderWidth=0.5, borderPadding=6, spaceBefore=4, spaceAfter=4)


def tag(label: str, bg: str) -> Paragraph:
    return Paragraph(
        f'<font color="white"><b>&nbsp;{label}&nbsp;</b></font>',
        ParagraphStyle('tag', parent=BODY, fontSize=8.5,
                       textColor=colors.white, backColor=colors.HexColor(bg))
    )


def section_card(title: str, status: str, status_color: str, rows: list,
                 description: str, recommendation: str) -> KeepTogether:
    """Build a self-contained section so it doesn't split awkwardly across pages."""
    parts = []
    header_tbl = Table(
        [[Paragraph(f'<b>{title}</b>', H3),
          Paragraph(f'<font color="white"><b>&nbsp;{status}&nbsp;</b></font>',
                    ParagraphStyle('s', parent=BODY, alignment=2,
                                   backColor=colors.HexColor(status_color),
                                   textColor=colors.white))]],
        colWidths=[5.4*inch, 1.3*inch],
    )
    header_tbl.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    parts.append(header_tbl)
    parts.append(Paragraph(description, BODY))

    if rows:
        tbl = Table(rows, colWidths=[1.7*inch, 2.5*inch, 2.5*inch], hAlign='LEFT')
        tbl.setStyle(TableStyle([
            ('FONTNAME',  (0,0), (-1,0), 'Helvetica-Bold'),
            ('BACKGROUND',(0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('FONTSIZE',  (0,0), (-1,-1), 8.5),
            ('VALIGN',    (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING',  (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING',   (0,0), (-1,-1), 4),
            ('BOTTOMPADDING',(0,0), (-1,-1), 4),
            ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1),
             [colors.white, colors.HexColor('#fafafa')]),
        ]))
        parts.append(tbl)

    if recommendation:
        parts.append(Paragraph(f'<b>Recommendation:</b> {recommendation}', NOTE))

    parts.append(Spacer(1, 8))
    return KeepTogether(parts)


# ── Build doc ──────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(str(OUTPUT), pagesize=LETTER,
                        leftMargin=0.7*inch, rightMargin=0.7*inch,
                        topMargin=0.6*inch, bottomMargin=0.6*inch,
                        title="Kardama.ai — API & Pricing Reference",
                        author="Kardama.ai")

story = []

# ── Cover ──────────────────────────────────────────────────────────────────
story.append(Paragraph("Kardama.ai", H1))
story.append(Paragraph(
    "External APIs & service pricing — what the app needs to run for real",
    ParagraphStyle('Sub', parent=BODY, fontSize=11, textColor=colors.HexColor('#475569'),
                   spaceAfter=10)))
story.append(Paragraph(f"Generated {date.today().isoformat()}", SMALL))
story.append(Spacer(1, 12))

# Quick summary table
summary_rows = [
    ['Service',           'Used for',                         'Status',  'Min monthly cost'],
    ['Twilio SMS',        'Booking confirmations, campaigns', 'Required','~$1.15 + $0.008/SMS'],
    ['OSRM',              'Live-map driving routes',          'In use',  'Free (fair-use demo)'],
    ['CARTO / OSM tiles', 'Map basemap',                      'In use',  'Free (fair-use)'],
    ['unpkg.com',         'Leaflet marker icons CDN',         'In use',  'Free'],
    ['Nominatim (OSM)',   'Address → coordinates (geocoding)','Optional','Free (1 req/sec)'],
    ['OpenAI',            'AI post generator (real LLM)',     'Optional','Pay-as-you-go (~$0.001/post)'],
    ['Anthropic Claude',  'Alt to OpenAI',                    'Optional','Pay-as-you-go'],
    ['Vercel hosting',    'Deployment',                       'Required','Free (Hobby) → $20+'],
    ['Vercel KV / Upstash','Booking persistence (prod)',      'Recommended','Free tier'],
    ['Neon / Supabase',   'Customer DB (prod)',               'Recommended','Free tier'],
    ['Stripe',            'Payment processing (if collected online)','Future','2.9% + $0.30/txn'],
    ['Resend',            'Transactional email (if added)',   'Future',  'Free → $20/mo'],
    ['Sentry',            'Error tracking',                    'Optional','Free → $26/mo'],
]
summary = Table(summary_rows, colWidths=[1.4*inch, 2.5*inch, 1.0*inch, 1.85*inch])
summary.setStyle(TableStyle([
    ('FONTNAME',  (0,0), (-1,0), 'Helvetica-Bold'),
    ('BACKGROUND',(0,0), (-1,0), colors.HexColor('#1e293b')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTSIZE',  (0,0), (-1,-1), 8.5),
    ('VALIGN',    (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING',  (0,0), (-1,-1), 5),
    ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ('TOPPADDING',   (0,0), (-1,-1), 4),
    ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#cbd5e1')),
    ('ROWBACKGROUNDS', (0,1), (-1,-1),
     [colors.white, colors.HexColor('#f1f5f9')]),
]))
story.append(summary)
story.append(Spacer(1, 14))

story.append(Paragraph(
    "<b>How to read this:</b> each service below shows exactly what Kardama.ai uses it for, "
    "the free tier (when one exists), the paid tiers most likely to apply, and a recommendation. "
    "Free options are preferred wherever they exist; the few paid services left are the ones "
    "that genuinely deliver value — typically because there is no good free equivalent.",
    BODY))

story.append(PageBreak())


# ─────────────────────────────────────────────────────────────────────────────
# 1. TWILIO
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("1 · Twilio SMS — required, paid", H2))
story.append(section_card(
    title="Twilio Programmable Messaging",
    status="REQUIRED",
    status_color="#dc2626",
    description=(
        "Used by <code>/api/sms/send</code>, <code>/api/campaigns/send</code>, and "
        "<code>/api/webhooks/twilio</code> (inbound). Sends customer booking-link SMS, "
        "confirmation messages, and one-off operator texts. There is no comparable free "
        "alternative for SMS to US mobile numbers — every provider passes through carrier fees."
    ),
    rows=[
        ['Item', 'Price (US, 2025–26)', 'Notes'],
        ['Phone number (local)',     '$1.15 / month',         'One-time setup needed'],
        ['Phone number (toll-free)', '$2.00 / month',          'Better deliverability'],
        ['Outbound SMS (A2P 10DLC)', '$0.0083 + carrier fees', '~$0.013–$0.017 effective'],
        ['Inbound SMS',              '$0.0079',                'Hits webhook for inbox'],
        ['MMS outbound',             '$0.02 + carrier fees',   'If sending images later'],
        ['10DLC brand registration', '$4 one-time',            'Required for A2P traffic'],
        ['10DLC campaign vetting',   '$10 one-time + $1.50/mo','Per messaging campaign'],
        ['Free trial credit',        '$15.50',                  'Enough to test ~1,000 msgs'],
    ],
    recommendation=(
        "Plan for ~$0.015 per SMS sent at scale. For a cleaning business doing 50 booking "
        "confirmations/week, that's roughly $3/mo + the $1.15 number rental. There is no "
        "free SMS option that survives carrier filtering — Twilio is the right call."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 2. OSRM
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("2 · OSRM — driving directions (free, in use)", H2))
story.append(section_card(
    title="OSRM — Open Source Routing Machine",
    status="FREE",
    status_color="#16a34a",
    description=(
        "Used by <code>src/lib/mapbox-routing.ts</code> to fetch real road geometry for the "
        "live map. Calls <code>https://router.project-osrm.org</code> directly from the browser. "
        "No API key needed."
    ),
    rows=[
        ['Tier', 'Limits', 'Cost'],
        ['Public demo server',   'Fair-use only — no SLA',                   'Free'],
        ['Self-hosted (Docker)', 'Unlimited; needs ~2GB RAM per region',      'Free (compute only)'],
        ['Mapbox Directions',    '100K req/mo free, then $0.50–$2/1K',        'Paid alternative'],
        ['Google Directions',    '40K req/mo free, then $5/1K (one-shot)',    'Paid alternative'],
    ],
    recommendation=(
        "Stay on the public demo server for now — Kardama.ai loads ~5 routes per page view, "
        "well within fair-use. If usage grows past a few thousand req/day, self-host OSRM on "
        "a $5/mo VPS rather than paying Mapbox. Already wired up; no action needed today."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 3. MAP TILES
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("3 · Map basemaps & marker icons (free, in use)", H2))
story.append(section_card(
    title="CARTO / OpenStreetMap / Esri tiles",
    status="FREE",
    status_color="#16a34a",
    description=(
        "Live Map loads CARTO dark-mode tiles and Esri satellite tiles directly from their CDNs. "
        "Leaflet marker icons come from <code>unpkg.com</code>. Already CSP-allowlisted in "
        "<code>next.config.ts</code> after this fix."
    ),
    rows=[
        ['Provider', 'What it serves', 'Cost'],
        ['CARTO Basemaps',          'Dark/light streets',     'Free for fair-use; $200+/mo enterprise'],
        ['Esri ArcGIS Online',      'Satellite imagery',      'Free attribution-only; paid for high-volume'],
        ['OpenStreetMap tiles',     'Default streets',         'Free fair-use'],
        ['Stadia Maps',             'Commercial OSM tiles',    'Free up to 200K tiles/mo'],
        ['Mapbox Tiles',            'Polished commercial',     '$0.50/1K (50K free/mo)'],
    ],
    recommendation=(
        "Current setup is free and looks great. If Kardama hits >5,000 daily map views, "
        "switch to Stadia Maps (free up to 200K tiles/mo with a commercial license) to be on "
        "more solid legal ground. No code change needed beyond swapping the tile URL."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 4. GEOCODING
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("4 · Geocoding (address → lat/lng)", H2))
story.append(section_card(
    title="Nominatim (OpenStreetMap)",
    status="FREE / OPTIONAL",
    status_color="#16a34a",
    description=(
        "Not yet wired in — customer addresses currently come pre-coordinated from mock-data. "
        "Once new customers are added through the UI, you'll need geocoding to plot them on "
        "the map and compute drive-times. The CSP already allows Nominatim hits."
    ),
    rows=[
        ['Provider', 'Free tier', 'Notes'],
        ['Nominatim (OSM)',     '1 req/sec, requires User-Agent', 'Best free option'],
        ['Geoapify',            '3,000 req/day free',              'Easier rate limits'],
        ['Mapbox Geocoding',    '100K req/mo free',                '$0.50–$0.75/1K paid'],
        ['Google Geocoding',    '40K req/mo free',                 '$5/1K paid'],
    ],
    recommendation=(
        "Use Nominatim for the in-app customer-add flow (geocode once at create time, then "
        "cache lat/lng on the customer record). Stay free indefinitely. No paid tier needed "
        "unless you import thousands of addresses at once."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 5. OPENAI
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("5 · OpenAI — real AI post generation (paid, optional)", H2))
story.append(section_card(
    title="OpenAI Chat Completions",
    status="OPTIONAL",
    status_color="#2563eb",
    description=(
        "Wired into <code>/api/marketing/generate</code>. Set <code>OPENAI_API_KEY</code> and "
        "the AI Post Generator on the Marketing page calls a real LLM; without the key it "
        "falls back to local templates so the demo still works. Set <code>OPENAI_MODEL</code> "
        "to override the default <code>gpt-4o-mini</code>."
    ),
    rows=[
        ['Model', 'Input / Output cost (per 1M tokens)', 'Per Kardama post (~600 tok)'],
        ['gpt-4o-mini (default)', '$0.15 / $0.60',  '~$0.0004 — recommended'],
        ['gpt-4o',                '$2.50 / $10.00', '~$0.006'],
        ['gpt-4.1',               '$3.00 / $12.00', '~$0.008'],
        ['gpt-5 (preview)',       'tiered',         '~$0.02+'],
        ['Free trial',            '$5 promo credit',  'Enough for 10K mini-posts'],
    ],
    recommendation=(
        "Use <b>gpt-4o-mini</b> — the marketing copy quality is excellent and a year of weekly "
        "posts costs &lt; $1. The current value is real: template posts get repetitive across "
        "52 weeks, while the LLM produces genuinely varied copy."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 6. ANTHROPIC
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("6 · Anthropic Claude — alternative LLM (paid, optional)", H2))
story.append(section_card(
    title="Anthropic Claude API",
    status="ALTERNATIVE",
    status_color="#7c3aed",
    description=(
        "Drop-in alternative to OpenAI for the AI post generator. Slightly higher quality "
        "for marketing copy in informal testing, slightly higher price."
    ),
    rows=[
        ['Model', 'Input / Output cost (per 1M tokens)', 'Per Kardama post'],
        ['Haiku 4.5',     '$0.80 / $4.00',    '~$0.003'],
        ['Sonnet 4.6',    '$3.00 / $15.00',   '~$0.010'],
        ['Opus 4.7',      '$15.00 / $75.00',  '~$0.050'],
    ],
    recommendation=(
        "Stick with OpenAI gpt-4o-mini unless you specifically prefer Claude's tone. If you "
        "want to swap, change the fetch URL and shape inside <code>/api/marketing/generate</code>."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 7. HOSTING
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("7 · Vercel — deployment (free tier covers this app)", H2))
story.append(section_card(
    title="Vercel Hosting",
    status="REQUIRED",
    status_color="#dc2626",
    description=(
        "Already configured (<code>vercel.json</code>). Hobby tier is enough for a single "
        "owner-operated cleaning business. Pro becomes worth it if you add team members or "
        "need higher function limits."
    ),
    rows=[
        ['Tier', 'What you get', 'Price'],
        ['Hobby',      '100 GB bandwidth, 1 hr/mo function time, 100K invocations',    'Free'],
        ['Pro',        '1 TB bandwidth, 1,000 GB-hr functions, team features, KV',     '$20 / seat / mo'],
        ['Enterprise', 'SSO, SLA, dedicated support',                                    'Custom'],
    ],
    recommendation=(
        "Start on Hobby. Upgrade only if you bring on a partner who also needs deploy access "
        "or if function execution exceeds the included hour."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 8. DATABASE / KV
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("8 · Persistence — booking store + customer DB", H2))
story.append(section_card(
    title="Vercel KV / Upstash Redis (booking store)",
    status="RECOMMENDED",
    status_color="#0891b2",
    description=(
        "Right now <code>src/lib/booking-store.ts</code> uses in-memory Maps that reset on every "
        "server restart — fine for a demo, broken for production (a confirmed booking can vanish). "
        "Swap the implementations for Redis to fix MAJOR-1 from the audit."
    ),
    rows=[
        ['Provider', 'Free tier', 'Paid'],
        ['Upstash Redis', '10K commands/day, 256MB', '$0.20 / 100K commands'],
        ['Vercel KV',     'Built on Upstash, $0.50/mo + $0.20/100K reads', 'Tighter Vercel integration'],
        ['Self-hosted Redis (Fly/Railway)', '256MB instance ~free', '$5/mo for production'],
    ],
    recommendation=(
        "Use <b>Upstash Redis free tier</b> — Kardama writes &lt;100 booking-related commands "
        "per day, comfortably inside 10K/day. One env var (<code>UPSTASH_REDIS_REST_URL</code>) "
        "and a 30-line refactor of booking-store.ts gets you durable bookings."
    ),
))
story.append(Spacer(1, 4))
story.append(section_card(
    title="Neon Postgres / Supabase (customer + job DB)",
    status="RECOMMENDED",
    status_color="#0891b2",
    description=(
        "Customer, cleaner, job, payment data is currently a hardcoded array in "
        "<code>src/lib/mock-data.ts</code>. To accept new customers from the app, you need a "
        "real database. Both options below have generous free tiers."
    ),
    rows=[
        ['Provider', 'Free tier', 'Paid'],
        ['Neon Postgres', '500 MB storage, 1 project',                '$19/mo for 10 GB'],
        ['Supabase',      '500 MB DB + 1 GB file storage + auth',     '$25/mo for 8 GB'],
        ['PlanetScale',   '5 GB storage (relaunched Hobby tier)',     '$39/mo'],
        ['Turso',         '500 DBs, 9 GB total',                       '$0 → $29/mo'],
    ],
    recommendation=(
        "Pick <b>Supabase</b> if you also want auth (login for owner/team) and storage for "
        "before/after photos. Pick <b>Neon</b> if you only need a database. Both are free for "
        "Kardama's data volume — under 10K rows is well below any limit."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 9. PAYMENT PROCESSING
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("9 · Payments — Stripe (future, when collecting online)", H2))
story.append(section_card(
    title="Stripe",
    status="FUTURE",
    status_color="#6b7280",
    description=(
        "The Payments page tracks Zelle/Venmo/cash already received — no API needed for that. "
        "If you want customers to pay through the booking link, add Stripe Checkout."
    ),
    rows=[
        ['Item', 'Price', 'Notes'],
        ['Per transaction',     '2.9% + $0.30',        'Stripe Checkout or Elements'],
        ['Instant payouts',     '1.5%',                 'Optional, for same-day money'],
        ['Subscriptions',       '0.5% on top',          'For recurring weekly cleans'],
        ['Setup',               'Free',                  'Free to integrate, no monthly fee'],
        ['Alternatives',        'Square (2.6% + $0.10), PayPal (3.49% + $0.49)', ''],
    ],
    recommendation=(
        "Not needed right now. Add Stripe Checkout only when customers ask to pay online — "
        "Kardama's existing Zelle/Venmo flow is cheaper for the operator and works fine."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 10. EMAIL
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("10 · Email (future) — Resend / SendGrid", H2))
story.append(section_card(
    title="Resend (recommended) / SendGrid",
    status="FUTURE",
    status_color="#6b7280",
    description=(
        "No transactional email is sent today — confirmations are SMS only. If you want booking "
        "receipts emailed, plug in Resend (best Next.js DX) or SendGrid."
    ),
    rows=[
        ['Provider', 'Free tier', 'Paid'],
        ['Resend',   '100 emails/day, 3,000/month',         '$20/mo for 50K'],
        ['SendGrid', '100 emails/day forever',               '$19.95/mo for 50K'],
        ['Postmark', 'No free tier; 100 free/mo on signup',  '$15/mo for 10K'],
        ['Mailgun',  'No free tier (was 5K free/mo)',         '$15/mo for 10K'],
    ],
    recommendation=(
        "Resend's free tier covers Kardama for years. Add only if customers ask for emailed "
        "receipts."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 11. ERROR TRACKING
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("11 · Error tracking (optional)", H2))
story.append(section_card(
    title="Sentry",
    status="OPTIONAL",
    status_color="#6b7280",
    description=(
        "Right now errors are <code>console.error</code> only. Sentry would catch frontend "
        "and API errors with stack traces — useful once real customers are using the app."
    ),
    rows=[
        ['Tier', 'Limits', 'Cost'],
        ['Developer',   '5K errors, 10K performance, 50 replays/mo',  'Free'],
        ['Team',        '50K errors, 100K performance',                 '$26/mo'],
        ['Business',    '250K errors, full feature set',                '$80/mo'],
        ['Alternative', 'Better Stack Logs',                             'Free → $24/mo'],
    ],
    recommendation=(
        "Sign up for the free Developer tier the first day Kardama goes live with real users. "
        "5K errors/month is plenty for an app this size and the setup is &lt;5 min."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# 12. CRON / SCHEDULING
# ─────────────────────────────────────────────────────────────────────────────
story.append(Paragraph("12 · Scheduled jobs — campaign automation", H2))
story.append(section_card(
    title="Vercel Cron / Upstash QStash",
    status="OPTIONAL",
    status_color="#6b7280",
    description=(
        "<code>src/lib/campaign-engine.ts</code> contains the logic to identify customers who "
        "haven't booked in 18+ days and surface them as nurturing candidates — but nothing runs "
        "it on a schedule. Hooking it up makes the campaigns page actually proactive."
    ),
    rows=[
        ['Provider', 'Free tier', 'Notes'],
        ['Vercel Cron',       'Free on Hobby, daily granularity',  'Easiest — just add to vercel.json'],
        ['Upstash QStash',    '500 messages/day free',              'More flexible scheduling'],
        ['GitHub Actions',     '2,000 min/mo free (private repos)',  'Cron via workflow file'],
    ],
    recommendation=(
        "Use <b>Vercel Cron</b> — add a <code>crons</code> entry to <code>vercel.json</code> "
        "that hits a new <code>/api/campaigns/scan</code> endpoint daily. Fully free."
    ),
))

# ─────────────────────────────────────────────────────────────────────────────
# Bottom-line cost section
# ─────────────────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Bottom-line cost scenarios", H2))

scenario_rows = [
    ['Scenario', 'Monthly cost', 'What it covers'],

    ['Demo / portfolio',
     '$0',
     'No SMS, no AI calls, no DB. Mock data only. Vercel Hobby free.'],

    ['Single solo operator (now)',
     '~$5–10',
     'Twilio number ($1.15) + ~50 SMS/mo (~$1) + Upstash free + Supabase free. '
     'OpenAI optional ~$0.50/mo for weekly AI posts.'],

    ['Small business, 200 SMS/mo',
     '~$10–15',
     'Twilio ~$3.50, OpenAI ~$1, Supabase free, Vercel Hobby free, Sentry free.'],

    ['Growing — 1,000 SMS/mo + 500 customers',
     '~$25–35',
     'Twilio ~$15, OpenAI ~$2, Supabase free, Vercel Hobby still free, Sentry free.'],

    ['Multi-region — 5,000 SMS/mo, 2 owners',
     '~$120–150',
     'Twilio ~$80, Vercel Pro $20 (2 seats), Supabase Pro $25, Sentry $26, OpenAI ~$5.'],
]

scenarios = Table(scenario_rows, colWidths=[2.0*inch, 1.2*inch, 3.6*inch])
scenarios.setStyle(TableStyle([
    ('FONTNAME',  (0,0), (-1,0), 'Helvetica-Bold'),
    ('BACKGROUND',(0,0), (-1,0), colors.HexColor('#1e293b')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTSIZE',  (0,0), (-1,-1), 9),
    ('VALIGN',    (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING',  (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING',   (0,0), (-1,-1), 6),
    ('BOTTOMPADDING',(0,0), (-1,-1), 6),
    ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#cbd5e1')),
    ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#dcfce7')),
    ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#ecfdf5')),
    ('BACKGROUND', (0,3), (-1,3), colors.HexColor('#fef9c3')),
    ('BACKGROUND', (0,4), (-1,4), colors.HexColor('#fef3c7')),
    ('BACKGROUND', (0,5), (-1,5), colors.HexColor('#fee2e2')),
]))
story.append(scenarios)
story.append(Spacer(1, 12))

# What's free vs paid
story.append(Paragraph("Why anything paid? — quick justification", H3))
story.append(Paragraph(
    "<b>Twilio</b> is the only genuinely unavoidable paid service. SMS to US carriers requires "
    "carrier-fee passthrough; no provider serves it free at any scale. Every alternative "
    "(MessageBird, Plivo, Sinch) sits within ±20% of Twilio's pricing.",
    BODY))
story.append(Paragraph(
    "<b>OpenAI</b> is optional but cheap (&lt;$1/mo for Kardama's expected usage) and the value "
    "is concrete — varied marketing copy across 52 weeks instead of cycling 5 templates.",
    BODY))
story.append(Paragraph(
    "<b>Stripe / Resend / Sentry</b> are all free at Kardama's expected volume. Vercel Pro "
    "becomes worth $20 only if you add a teammate or hit function-time limits. Supabase / Neon "
    "free tiers each fit ~5,000 customers comfortably.",
    BODY))

story.append(Spacer(1, 12))
story.append(Paragraph("Setup checklist", H3))
checklist = [
    "Sign up for Twilio → buy a $1.15/mo local number → register a 10DLC brand+campaign ($14 + $1.50/mo).",
    "Create a Supabase project → copy DATABASE_URL into .env.local (free tier, no card needed).",
    "Create an Upstash Redis instance → copy UPSTASH_REDIS_REST_URL + REST_TOKEN.",
    "(Optional) Get an OpenAI API key → add OPENAI_API_KEY → the AI Post Generator goes live.",
    "Generate a 32-byte secret → set BOOKING_TOKEN_SECRET (booking links won't work without this).",
    "Set ADMIN_API_KEY to a long random string → required to read /api/bookings.",
    "Deploy to Vercel → add the env vars in Project Settings → first deploy.",
    "Add an inbound SMS webhook in Twilio pointing at https://your-domain/api/webhooks/twilio.",
    "(Later) Sign up for Sentry free → add NEXT_PUBLIC_SENTRY_DSN.",
]
for i, item in enumerate(checklist, 1):
    story.append(Paragraph(f"{i}. {item}", BODY))

story.append(Spacer(1, 14))
story.append(Paragraph(
    f"<i>Prices are 2025–26 list prices in USD; subject to change. Verify "
    f"current rates on each provider's website before committing.</i>", SMALL))

# Build it
doc.build(story)
print(f"Wrote {OUTPUT}")
