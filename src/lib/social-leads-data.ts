import { ResponseTemplate } from '@/types'

export const RESPONSE_TEMPLATES: ResponseTemplate[] = [
  {
    id: 'tmpl-intro-1',
    title: 'Standard Introduction',
    category: 'intro',
    platforms: ['facebook-group', 'facebook-page', 'nextdoor'],
    tags: ['intro', 'general'],
    content: `Hi [Name]! 👋 We'd love to help! We're Kardama Clean — a local, fully insured cleaning team serving Long Beach, Torrance, El Segundo, and surrounding South Bay areas.

✅ Bonded & insured
✅ Background-checked cleaners
✅ Teams of 2 for faster service
✅ Same-day/next-day availability

We'd love to get you a quick quote — what size is your home and when are you looking to schedule? Feel free to DM us! 🏠✨`,
  },
  {
    id: 'tmpl-intro-2',
    title: 'Quick & Friendly Reply',
    category: 'intro',
    platforms: ['facebook-group', 'facebook-page', 'nextdoor', 'instagram'],
    tags: ['intro', 'short', 'casual'],
    content: `Hi [Name]! We serve that area and would love to help! DM us with your home size and preferred dates for a quick quote 😊 We have same-week availability!`,
  },
  {
    id: 'tmpl-airbnb',
    title: 'Airbnb Turnover Specialist',
    category: 'intro',
    platforms: ['facebook-group', 'facebook-page'],
    tags: ['airbnb', 'turnover'],
    content: `Hi [Name]! Airbnb turnovers are our specialty! 🏡 We offer fast, reliable same-day turnover cleanings in the [City] area.

⚡ Fast 2–3 hour turnovers
📅 Flexible scheduling (even weekends)
✅ Fresh linens, restocked amenities
📸 Photo confirmation after each clean

Many of our clients are Airbnb hosts! DM us to set up a turnover schedule — we'll make hosting stress-free.`,
  },
  {
    id: 'tmpl-deep-clean',
    title: 'Deep Clean Reply',
    category: 'intro',
    platforms: ['facebook-group', 'facebook-page', 'nextdoor'],
    tags: ['deep-clean', 'move-out'],
    content: `Hi [Name]! Deep cleans are our specialty! 💪 We do a thorough top-to-bottom clean including:

✅ Inside oven & fridge
✅ Baseboards & ceiling fans
✅ Inside cabinets
✅ Windows (interior)
✅ Behind appliances

We serve [City] and surrounding areas. DM us to get a same-week quote! Fully insured & background-checked cleaners.`,
  },
  {
    id: 'tmpl-promo-first',
    title: '15% Off First Clean',
    category: 'promo',
    platforms: ['facebook-group', 'facebook-page', 'nextdoor', 'instagram'],
    tags: ['promo', 'discount', 'new-client'],
    content: `Hi [Name]! Great news — we're actually offering 15% off for new clients this month! 🎉

We serve [City] and would love to earn your trust. Our bonded & insured teams of 2 have served 1,200+ happy clients across the LA/Long Beach area.

Send us a DM with your home size & preferred dates to claim the discount — slots are limited!`,
  },
  {
    id: 'tmpl-promo-referral',
    title: 'Referral Offer',
    category: 'promo',
    platforms: ['facebook-group', 'facebook-page'],
    tags: ['promo', 'referral'],
    content: `Hi [Name]! We'd love to help! And as a bonus — if you book with us and refer a friend, you BOTH get $25 off your next cleaning 🎁

We serve [City] and the surrounding South Bay. DM us to check availability!`,
  },
  {
    id: 'tmpl-followup-1',
    title: 'Follow-Up (No Reply)',
    category: 'follow-up',
    platforms: ['facebook-group', 'facebook-page', 'nextdoor'],
    tags: ['follow-up'],
    content: `Hi [Name]! Just following up on my message from earlier — we still have openings this week if you're still looking for a cleaning service! Feel free to DM us anytime 😊`,
  },
  {
    id: 'tmpl-followup-2',
    title: 'Follow-Up with Promo',
    category: 'follow-up',
    platforms: ['facebook-group', 'facebook-page'],
    tags: ['follow-up', 'promo'],
    content: `Hi [Name]! Wanted to check back in — we still have a few openings this week and our 15% new client discount is still available! DM us anytime 🏠`,
  },
  {
    id: 'tmpl-group-promo',
    title: 'Group Promo Post',
    category: 'group-post',
    platforms: ['facebook-group'],
    tags: ['group', 'promo', 'broadcast'],
    content: `🏠 Looking for a reliable cleaning service in the [City] area?

We're Kardama Clean — a local, fully insured cleaning team serving Long Beach, Torrance, El Segundo, Manhattan Beach & surrounding areas.

✅ Bonded & insured
✅ Background-checked cleaners
✅ Teams of 2 for efficient cleanings
✅ Same-week availability
✅ Standard, deep, move-out & Airbnb turnovers

Currently offering 15% off for new clients! 🎉

Comment below or DM us for a free quote! 👇

#LongBeachCleaning #SouthBayCleaning #HomeCleaning #HouseCleaningService`,
  },
  {
    id: 'tmpl-instagram-1',
    title: 'Instagram Caption — Before/After',
    category: 'instagram',
    platforms: ['instagram'],
    tags: ['instagram', 'before-after', 'visual'],
    content: `✨ Another transformation complete! ✨

Before → After | 3BD/2BA deep clean in Long Beach 🏡

Our bonded & insured team of 2 works fast so you can enjoy your clean home ASAP.

📲 DM us to book!
📍 Serving Long Beach, Torrance, El Segundo & South Bay

#KardamaClean #LongBeachCleaning #DeepClean #BeforeAndAfter #HomeCleaning #CleanHome #SouthBay #LongBeach`,
  },
  {
    id: 'tmpl-instagram-2',
    title: 'Instagram Caption — Availability',
    category: 'instagram',
    platforms: ['instagram'],
    tags: ['instagram', 'availability', 'cta'],
    content: `We have openings this week! 📅

Tired of spending your weekends cleaning? Let us handle it so you can actually enjoy your time off 🙌

✅ Fully insured & background-checked
✅ Teams of 2
✅ Flexible scheduling
✅ 15% off your first clean

📍 Long Beach | Torrance | El Segundo | Manhattan Beach | South Bay

Comment "QUOTE" below or DM us to book!

#HomeCleaning #LongBeach #SouthBay #HouseCleaningService #CleanHome`,
  },
]
