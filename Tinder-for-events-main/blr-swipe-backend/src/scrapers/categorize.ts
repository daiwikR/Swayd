import type { EventCategory } from '../models/Card';

/**
 * Keyword-based category classifier shared by all scrapers.
 * Order matters: more specific categories are checked before broader ones
 * (e.g. "stand-up comedy night" must hit comedy before nightlife's "night").
 */
const RULES: Array<[EventCategory, RegExp]> = [
  ['comedy', /\b(comedy|comedian|stand[- ]?up|standup|open mic|improv|hasya|roast)\b/i],
  ['fitness', /\b(yoga|zumba|crossfit|bootcamp|pilates|aerobics|calisthenics|spin class|cycling class)\b/i],
  ['wellness', /\b(wellness|meditat\w*|mindful\w*|sound bath|breathwork|healing|therapy|retreat|satsang)\b/i],
  ['tech', /\b(hackathon|tech|technology|developer|coding|programming|startup|saas|blockchain|web3|crypto|devops|data science|machine learning|artificial intelligence|\bai\b|\bml\b|cybersecurity|product manag\w*|ux|figma)\b/i],
  ['networking', /\b(networking|meetup|conference|summit|entrepreneur\w*|founders?|business|b2b|investors?|pitch|demo day|career fair)\b/i],
  ['sports', /\b(cricket|football|soccer|marathon|badminton|tennis|basketball|kabaddi|trek\w*|hik\w*|pickleball|esports|10k|5k run|namma run)\b/i],
  ['food', /\b(food|brunch|dinner|lunch|tasting|culinary|buffet|wine|beer|cocktail|whisky|barbecue|bbq|pop[- ]?up kitchen|supper)\b/i],
  ['art', /\b(art|painting|pottery|theatre|theater|drama|play\b|poetry|spoken word|exhibition|museum|craft|sketch\w*|photography|film screening|short film|dance workshop|origami)\b/i],
  ['nightlife', /\b(party|parties|club night|nightlife|nightclub|ladies night|rave|after ?party|bollywood night|saturday night|friday night|new year|nye)\b/i],
  ['music', /\b(music|concert|gig|live band|band\b|tour\b|dj\b|edm|techno|house music|hip ?hop|rap\b|indie|rock\b|metal\b|jazz|blues|karaoke|unplugged|acoustic|singer|vocalist|sufi|ghazal|carnatic|hindustani|bollywood|punjabi|sunburn|orchestra|symphony|choir|drummer|guitarist|pianist|violin|flute|live in (bengaluru|bangalore)|india tour)\b/i],
];

export function categorize(text: string, fallback: EventCategory = 'other'): EventCategory {
  for (const [category, pattern] of RULES) {
    if (pattern.test(text)) return category;
  }
  return fallback;
}

/** Decode HTML entities that JSON-LD blocks commonly carry (&amp;, &#39;, …). */
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
