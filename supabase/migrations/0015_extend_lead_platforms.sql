-- Extend social_leads.platform to cover Apify-based scrapers run from n8n.
-- Adds 'google-maps' and 'yelp' alongside the existing FB / Instagram / Nextdoor / Messenger values.

alter table public.social_leads
  drop constraint if exists social_leads_platform_check;

alter table public.social_leads
  add constraint social_leads_platform_check
  check (platform in (
    'facebook-group',
    'facebook-page',
    'instagram',
    'nextdoor',
    'messenger',
    'google-maps',
    'yelp'
  ));
