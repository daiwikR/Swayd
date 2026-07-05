import axios from 'axios';
import * as cheerio from 'cheerio';
import type { EventCategory } from '../models/Card';
import { categorize, decodeEntities } from './categorize';
import type { ScrapedEvent } from './district';

/**
 * Scrapes Allevents.in category pages for Bangalore. Each page's category is
 * known from the URL, so events get accurate categories at the source — much
 * better signal for the recommender than keyword-guessing from titles.
 *
 * (Replaces the old BookMyShow scraper: BMS is behind Akamai and returns 403
 * to all server-side requests, and Eventbrite India no longer resolves.)
 */

// slug on allevents.in/bangalore/<slug> → our category.
// null means the page mixes categories (workshops), so classify per event.
const CATEGORY_PAGES: Array<{ slug: string; category: EventCategory | null }> = [
  { slug: 'music', category: 'music' },
  { slug: 'comedy', category: 'comedy' },
  { slug: 'parties', category: 'nightlife' },
  { slug: 'sports', category: 'sports' },
  { slug: 'food-drinks', category: 'food' },
  { slug: 'health-wellness', category: 'wellness' },
  { slug: 'art', category: 'art' },
  { slug: 'business', category: 'networking' },
  { slug: 'workshops', category: null },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
};

function parseEventsFromPage(html: string, pageCategory: EventCategory | null): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item['@type'] !== 'Event' || !item.name) continue;
        const source_url = String(item.url || '');
        if (!source_url) continue;
        const d = item.startDate ? new Date(item.startDate) : undefined;
        const title = decodeEntities(String(item.name).trim());
        const description = decodeEntities(String(item.description || '')).slice(0, 300);
        events.push({
          title,
          description: description || 'Event in Bangalore',
          image_url: Array.isArray(item.image) ? item.image[0] : String(item.image || ''),
          location: decodeEntities(String(item.location?.name || item.location?.address?.streetAddress || 'Bangalore')),
          datetime: d && !isNaN(d.getTime()) ? d : undefined,
          price: item.offers?.price ? Number(item.offers.price) : 0,
          category: pageCategory ?? categorize(`${title} ${description}`, 'tech'),
          source_url,
          age_rating: 'ALL_AGES',
          source: 'allevents',
        });
      }
    } catch { /* ignore malformed JSON-LD blocks */ }
  });

  return events;
}

export async function scrapeAlleventsCategories(): Promise<ScrapedEvent[]> {
  const results = await Promise.allSettled(
    CATEGORY_PAGES.map(async ({ slug, category }) => {
      const { data } = await axios.get(`https://allevents.in/bangalore/${slug}`, {
        headers: HEADERS,
        timeout: 15000,
      });
      return parseEventsFromPage(data, category);
    })
  );

  // Merge, dedupe by source_url (an event can appear on multiple pages — the
  // first page it appears on wins, and page order encodes category priority)
  const seen = new Set<string>();
  const events: ScrapedEvent[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const ev of r.value) {
      if (seen.has(ev.source_url)) continue;
      seen.add(ev.source_url);
      events.push(ev);
    }
  }

  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`[Allevents Categories] ${events.length} events from ${CATEGORY_PAGES.length - failed}/${CATEGORY_PAGES.length} category pages`);
  return events.filter(e => e.title && e.source_url);
}
