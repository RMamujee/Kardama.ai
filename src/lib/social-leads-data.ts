import { SocialLead, ResponseTemplate } from '@/types'
import { subMinutes, subHours, subDays, formatISO } from 'date-fns'

const now = new Date()
const m = (mins: number) => formatISO(subMinutes(now, mins))
const h = (hrs: number) => formatISO(subHours(now, hrs))
const d = (days: number) => formatISO(subDays(now, days))

export const SOCIAL_LEADS: SocialLead[] = [
  {
    id: 'lead-1',
    platform: 'facebook-group',
    author: 'Ashley M.',
    authorInitials: 'AM',
    groupOrPage: 'Long Beach Moms & Families',
    content: 'Hi ladies! Does anyone have a recommendation for a house cleaning service in Long Beach? Looking for someone reliable, 3BD/2BA home. Budget around $150-180. Thanks in advance!',
    postedAt: m(12),
    status: 'new',
    location: 'Long Beach, CA',
    urgency: 'high',
    likes: 3,
    comments: 7,
  },
  {
    id: 'lead-2',
    platform: 'facebook-group',
    author: 'Marcus T.',
    authorInitials: 'MT',
    groupOrPage: 'Torrance Community Board',
    content: 'Anyone know a good cleaning company in Torrance area? Need a deep clean before my in-laws visit next weekend. ASAP would be great 😅',
    postedAt: m(28),
    status: 'new',
    location: 'Torrance, CA',
    urgency: 'high',
    likes: 1,
    comments: 4,
  },
  {
    id: 'lead-3',
    platform: 'facebook-group',
    author: 'Priya S.',
    authorInitials: 'PS',
    groupOrPage: 'South Bay Neighbors',
    content: 'Looking for a cleaning service that serves the South Bay area — specifically Redondo Beach/Manhattan Beach. We need monthly cleanings for a 4BD home. Do you have any trusted recommendations?',
    postedAt: h(1),
    status: 'new',
    location: 'Redondo Beach, CA',
    urgency: 'medium',
    likes: 2,
    comments: 11,
  },
  {
    id: 'lead-4',
    platform: 'facebook-group',
    author: 'Jennifer K.',
    authorInitials: 'JK',
    groupOrPage: 'Long Beach Real Estate & Rentals',
    content: 'Need a move-out clean for a 2BD apartment in Long Beach by end of the month. Any reliable services you\'ve used? Hoping for something under $200.',
    postedAt: h(2),
    status: 'responded',
    respondedAt: h(1),
    responseUsed: 'intro',
    location: 'Long Beach, CA',
    urgency: 'high',
    likes: 0,
    comments: 5,
  },
  {
    id: 'lead-5',
    platform: 'nextdoor',
    author: 'Tom B.',
    authorInitials: 'TB',
    groupOrPage: 'Signal Hill Neighborhood',
    content: 'My regular cleaner moved away. Looking for someone local who does a thorough job. 3 beds, 2 baths, bi-weekly. Any personal recommendations?',
    postedAt: h(3),
    status: 'new',
    location: 'Signal Hill, CA',
    urgency: 'medium',
    likes: 4,
    comments: 9,
  },
  {
    id: 'lead-6',
    platform: 'facebook-group',
    author: 'Danielle R.',
    authorInitials: 'DR',
    groupOrPage: 'Lakewood Moms Group',
    content: 'Just had a baby and desperately need help keeping the house clean! Looking for a trustworthy cleaning service in Lakewood area. Any suggestions? Ideally pet-friendly 🐶',
    postedAt: h(4),
    status: 'new',
    location: 'Lakewood, CA',
    urgency: 'high',
    likes: 12,
    comments: 18,
  },
  {
    id: 'lead-7',
    platform: 'instagram',
    author: '@beachsidehomes_lb',
    authorInitials: 'BH',
    groupOrPage: 'Instagram — Local Post',
    content: 'Anyone in Long Beach using a good cleaning service they love? Mine just raised their prices way too much. Would love a recommendation! #LongBeach #HomeCleaning',
    postedAt: h(5),
    status: 'new',
    location: 'Long Beach, CA',
    urgency: 'medium',
    likes: 34,
    comments: 22,
  },
  {
    id: 'lead-8',
    platform: 'facebook-group',
    author: 'Ryan C.',
    authorInitials: 'RC',
    groupOrPage: 'El Segundo Parents Network',
    content: 'We need Airbnb turnover cleanings — we have a unit in El Segundo that books almost every weekend. Looking for a reliable team that can turn it around fast. Any recommendations?',
    postedAt: h(6),
    status: 'captured',
    respondedAt: h(5),
    responseUsed: 'airbnb',
    capturedAt: h(4),
    location: 'El Segundo, CA',
    urgency: 'high',
    likes: 2,
    comments: 8,
  },
  {
    id: 'lead-9',
    platform: 'facebook-group',
    author: 'Cassandra W.',
    authorInitials: 'CW',
    groupOrPage: 'Long Beach Moms & Families',
    content: 'Hi! Does anyone have a cleaning service they use regularly and LOVE? I want someone trustworthy because I work from home. Budget is flexible for the right service.',
    postedAt: h(8),
    status: 'responded',
    respondedAt: h(7),
    responseUsed: 'intro',
    location: 'Long Beach, CA',
    urgency: 'medium',
    likes: 5,
    comments: 14,
  },
  {
    id: 'lead-10',
    platform: 'facebook-group',
    author: 'Michael D.',
    authorInitials: 'MD',
    groupOrPage: 'Hawthorne Community Group',
    content: 'Looking for post-construction cleaning service. Just finished a remodel and the dust is everywhere. Need someone ASAP this week in the Hawthorne area.',
    postedAt: h(10),
    status: 'new',
    location: 'Hawthorne, CA',
    urgency: 'high',
    likes: 1,
    comments: 3,
  },
  {
    id: 'lead-11',
    platform: 'nextdoor',
    author: 'Sandra L.',
    authorInitials: 'SL',
    groupOrPage: 'Manhattan Beach Neighbors',
    content: 'My housekeeper retired after 8 years with us. Looking for a replacement — need someone very detail-oriented for a large home. Monthly deep cleans. Happy to pay well for the right service.',
    postedAt: h(12),
    status: 'dismissed',
    location: 'Manhattan Beach, CA',
    urgency: 'medium',
    likes: 0,
    comments: 6,
  },
  {
    id: 'lead-12',
    platform: 'facebook-group',
    author: 'Nina P.',
    authorInitials: 'NP',
    groupOrPage: 'Compton & Carson Parents',
    content: 'Does anyone know a cleaning service that works in the Carson/Compton area? Need a one-time deep clean for a 4BD house. Have 3 dogs so needs to be pet-friendly!',
    postedAt: d(1),
    status: 'new',
    location: 'Carson, CA',
    urgency: 'low',
    likes: 6,
    comments: 10,
  },
  {
    id: 'lead-13',
    platform: 'facebook-group',
    author: 'James H.',
    authorInitials: 'JH',
    groupOrPage: 'South Bay Home Services',
    content: 'Anyone have experience with cleaning services that do same-day or next-day bookings? We have guests coming tonight and really need help!!',
    postedAt: m(45),
    status: 'new',
    location: 'Torrance, CA',
    urgency: 'high',
    likes: 2,
    comments: 5,
  },
]

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

export const SCHEDULED_POSTS_MOCK = [
  {
    id: 'sp-1',
    content: `🏠 Looking for a reliable cleaning service in the Long Beach area?\n\nWe're Kardama Clean — bonded, insured, and trusted by 1,200+ families. Teams of 2 for fast service!\n\n✅ 15% off your first clean this month!\n\nComment below or DM us for a free quote! 👇`,
    platforms: ['facebook-groups'],
    targetGroupIds: ['fg1', 'fg2', 'fg3', 'fg4'],
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'queued',
    hashtags: ['#LongBeachCleaning', '#HomeCleaning', '#SouthBay'],
  },
  {
    id: 'sp-2',
    content: `✨ Another transformation complete! Deep clean in Torrance 🏡\n\nOur team spent 4 hours making this home spotless from top to bottom. The family was thrilled!\n\nReady for your own transformation? DM us! We serve the entire South Bay.\n\n#BeforeAndAfter #DeepClean #Torrance`,
    platforms: ['instagram', 'facebook-page'],
    targetGroupIds: [],
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'queued',
    hashtags: ['#BeforeAndAfter', '#DeepClean', '#Torrance', '#KardamaClean'],
  },
]
