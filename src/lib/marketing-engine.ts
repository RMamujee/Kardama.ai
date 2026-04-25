import { MarketingPost, MarketingTheme, FacebookGroup } from '@/types'
import { FACEBOOK_GROUPS } from './mock-data'
import { addWeeks, startOfYear, format, getMonth, getWeek } from 'date-fns'

export type PostTone = 'friendly' | 'professional' | 'urgent' | 'seasonal'

interface PostTemplate {
  content: string
  hashtags: string[]
}

const THEME_ROTATION: MarketingTheme[] = [
  'social-proof', 'promo-discount', 'tips', 'before-after', 'seasonal-spring',
  'promo-referral', 'social-proof', 'promo-discount', 'tips', 'holiday',
  'before-after', 'seasonal-summer', 'social-proof', 'promo-discount', 'tips',
  'seasonal-fall', 'social-proof', 'promo-referral', 'before-after', 'seasonal-winter',
]

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}

const POST_TEMPLATES: Record<MarketingTheme, PostTemplate[]> = {
  'social-proof': [
    {
      content: `⭐⭐⭐⭐⭐ "Best cleaning service in Long Beach!"\n\nWe just helped another family get their home sparkling clean. Our bonded, insured teams of 2 have over 1,200 happy clients across the LA/Long Beach area.\n\n📞 DM us or text to schedule your cleaning today! Same-day bookings available.\n\n#KardamaClean #LongBeachCleaning`,
      hashtags: ['#HomeCleaning', '#LongBeach', '#CleanHome', '#HouseCleaningService'],
    },
    {
      content: `💬 "Maria and Carlos did an AMAZING job — our house has never looked better!"\n\nThank you to our incredible clients! We take pride in every single job, big or small.\n\nLooking for a reliable cleaning team? We serve Long Beach, Torrance, El Segundo, and surrounding areas.\n\n✅ Fully insured  ✅ Background-checked  ✅ Eco-friendly products available\n\nDM to get a free quote!`,
      hashtags: ['#CleaningService', '#SouthBay', '#FiveStarCleaning'],
    },
  ],
  'promo-discount': [
    {
      content: `🏠 LIMITED OFFER: 15% OFF your first cleaning!\n\nNew to our service? Welcome! We want to earn your trust with an unbeatable first experience.\n\n📋 Services we offer:\n• Standard cleaning\n• Deep cleaning\n• Move-in/Move-out\n• Airbnb turnovers\n\nComment "FIRST" below or send a DM to claim. Offer ends Sunday!`,
      hashtags: ['#CleaningDiscount', '#LAHomeCleaning', '#NewClientOffer'],
    },
    {
      content: `🎉 REFERRAL BONUS! Give $25, Get $25!\n\nRefer a friend and you BOTH get $25 off your next cleaning. It's that simple.\n\nOur teams serve Long Beach, Torrance, Manhattan Beach, Redondo Beach, and more.\n\nDrop a friend's name in the comments or DM us to set it up! 👇`,
      hashtags: ['#ReferralProgram', '#LongBeachMoms', '#CleaningDeals'],
    },
  ],
  'tips': [
    {
      content: `🧹 3 CLEANING TIPS that make a big difference:\n\n1. Wipe down appliances weekly — grease buildup is much harder to remove later\n2. Use a squeegee on shower glass after every use — eliminates 80% of hard water buildup\n3. Rotate your mattress every 3 months — fresher sleep guaranteed!\n\nToo busy to keep up? That's what we're here for! 😊 DM us to schedule your cleaning.\n\n#CleaningTips #HomeHacks #LongBeachMoms`,
      hashtags: ['#CleaningTips', '#HomeHacks', '#OrganizedHome'],
    },
  ],
  'before-after': [
    {
      content: `✨ TRANSFORMATION TUESDAY ✨\n\nFrom cluttered and grimy → spotless and fresh!\n\nOur 2-person team spent 3 hours deep cleaning a 3BD/2BA home in Long Beach. The family was THRILLED.\n\nReady for your own transformation? We serve the entire South Bay and Long Beach area.\n\n📲 DM us or comment below — we respond fast! Available for same-week bookings.`,
      hashtags: ['#BeforeAfter', '#DeepClean', '#HomeTransformation', '#CleaningResults'],
    },
  ],
  'seasonal-spring': [
    {
      content: `🌸 SPRING CLEANING SEASON IS HERE! 🌸\n\nIs your home ready for a fresh start? Our deep cleaning special is perfect for spring!\n\nWe'll tackle:\n✅ Baseboards & ceiling fans\n✅ Inside appliances\n✅ Windows (interior)\n✅ Behind furniture\n✅ Full bathroom scrub-down\n\nLimited spring slots available — DM us NOW to book yours!\n\n#SpringCleaning #LongBeach #HomeCleaning`,
      hashtags: ['#SpringCleaning', '#SpringRefresh', '#SouthBayHomes'],
    },
  ],
  'seasonal-summer': [
    {
      content: `☀️ SUMMER READY? Let us help!\n\nWith kids out of school and family gatherings in full swing, your home deserves some extra love. Book a summer deep clean and start the season fresh!\n\n🏖 LA/Long Beach area\n🌟 Trusted by 1,200+ families\n💳 Pay via Zelle, Venmo, or cash\n\nSlots filling fast — DM to book this week!\n\n#SummerCleaning #LongBeachFamilies`,
      hashtags: ['#SummerCleaning', '#SummerReady', '#HomeCleaning'],
    },
  ],
  'seasonal-fall': [
    {
      content: `🍂 Fall is here — time for a fresh home!\n\nAs the kids head back to school and the weather cools down, give your home the refresh it deserves.\n\nOur fall deep clean special:\n🍂 Full kitchen clean\n🍂 Bathroom sanitization\n🍂 All floors mopped & vacuumed\n🍂 Dusting top to bottom\n\nBook this week and save 10%! DM for availability.\n\n#FallCleaning #BackToSchool #LongBeachMoms`,
      hashtags: ['#FallCleaning', '#FallRefresh', '#HomeCleaning'],
    },
  ],
  'seasonal-winter': [
    {
      content: `🎄 Holiday prep? We've got you covered!\n\nWith guests coming and holiday parties on the calendar, let us handle the cleaning so you can focus on what matters.\n\nWe offer:\n🎄 Pre-holiday deep cleans\n🎄 Post-party cleanups\n🎄 Move-in/out (perfect for the season!)\n\nBook early — December fills up FAST. DM us now!\n\n#HolidayCleaning #LongBeach #HomeCleaning`,
      hashtags: ['#HolidayCleaning', '#ChristmasCleaning', '#HomeCleaning'],
    },
  ],
  'promo-referral': [
    {
      content: `💜 Know someone who could use a good cleaning? Help them out AND get rewarded!\n\nOur referral program:\n→ You refer a friend\n→ They get $25 off their first clean\n→ You get $25 off your next clean\n\nWin-win! Tag someone below or DM us with their info. 👇\n\nWe serve Long Beach, Torrance, Manhattan Beach, Redondo, Hawthorne, and surrounding areas.\n\n#ReferAFriend #CleaningService #LongBeach`,
      hashtags: ['#ReferralProgram', '#Referral', '#CleaningService'],
    },
  ],
  'holiday': [
    {
      content: `🥳 Happy [Holiday] from our Kardama family to yours!\n\nThank you to every client who has trusted us with their home this year. We are so grateful for your support!\n\nGiving the gift of a clean home? We offer gift certificates! DM us for details.\n\n#HappyHolidays #Grateful #LongBeach #CleaningService`,
      hashtags: ['#HappyHolidays', '#GiftIdeas', '#CleanHome'],
    },
  ],
}

export function generatePost(weekNumber: number, year: number = new Date().getFullYear()): MarketingPost {
  const theme = THEME_ROTATION[(weekNumber - 1) % THEME_ROTATION.length]
  const templates = POST_TEMPLATES[theme]
  const template = templates[(weekNumber - 1) % templates.length]

  const jan1 = new Date(year, 0, 1)
  const date = addWeeks(jan1, weekNumber - 1)
  const month = getMonth(date)
  const season = getSeason(month)

  const currentWeek = getWeek(new Date())
  const status = weekNumber < currentWeek ? 'sent' : weekNumber === currentWeek ? 'scheduled' : 'draft'

  return {
    id: `post-w${weekNumber}`,
    weekNumber,
    scheduledDate: format(date, 'yyyy-MM-dd'),
    content: template.content,
    hashtags: template.hashtags,
    status: status as any,
    targetGroupIds: FACEBOOK_GROUPS.slice(0, 20).map(g => g.id),
    theme,
    engagementEstimate: 45 + ((weekNumber * 7) % 120),
  }
}

export function generateAllPosts(year: number = new Date().getFullYear()): MarketingPost[] {
  return Array.from({ length: 52 }, (_, i) => generatePost(i + 1, year))
}

export function generateAiPost(theme: MarketingTheme, tone: PostTone): string {
  const templates = POST_TEMPLATES[theme]
  const base = templates[Math.floor(Math.random() * templates.length)].content

  const toneModifiers: Record<PostTone, string> = {
    friendly: '\n\nWe love what we do, and it shows! 💛 Give us a call or DM anytime.',
    professional: '\n\nWe maintain the highest standards of service quality and customer satisfaction.',
    urgent: '\n\n⚠️ LIMITED SLOTS THIS WEEK — Book NOW before they fill up!',
    seasonal: '\n\n🌟 Perfect timing for the season — book today and feel the difference!',
  }

  return base + toneModifiers[tone]
}
