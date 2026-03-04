import axios from 'axios';
import * as cheerio from 'cheerio';
import type { EventCategory, EventSource } from '../models/Card';

export interface ScrapedEvent {
  title: string;
  description: string;
  image_url: string;
  location: string;
  datetime?: Date;
  price: number;
  category: EventCategory;
  source_url: string;
  age_rating: 'ALL_AGES' | '13+' | '18+' | '21+';
  source: EventSource;
}

function mapCategory(text: string): EventCategory {
  const t = text.toLowerCase();
  if (t.includes('music') || t.includes('concert') || t.includes('live')) return 'music';
  if (t.includes('comedy') || t.includes('stand-up')) return 'comedy';
  if (t.includes('tech') || t.includes('workshop') || t.includes('startup') || t.includes('hack')) return 'tech';
  if (t.includes('food') || t.includes('dining') || t.includes('drink') || t.includes('brunch')) return 'food';
  if (t.includes('art') || t.includes('gallery') || t.includes('theatre') || t.includes('drama') || t.includes('film')) return 'art';
  if (t.includes('sport') || t.includes('cricket') || t.includes('football') || t.includes('marathon')) return 'sports';
  if (t.includes('fitness') || t.includes('yoga') || t.includes('run') || t.includes('gym')) return 'fitness';
  if (t.includes('wellness') || t.includes('meditat') || t.includes('mindful')) return 'wellness';
  if (t.includes('night') || t.includes('party') || t.includes('dj') || t.includes('club')) return 'nightlife';
  if (t.includes('network') || t.includes('meetup') || t.includes('conference') || t.includes('summit')) return 'networking';
  return 'other';
}

// District/Insider — try their actual page with realistic browser headers
async function tryDistrict(): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  try {
    const { data } = await axios.get('https://www.district.in/events?city=bangalore', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    // JSON-LD first
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item['@type'] === 'Event' && item.name) {
            const source_url = String(item.url || '');
            if (!source_url) return;
            events.push({
              title: String(item.name).trim(),
              description: String(item.description || '').slice(0, 300) || 'Event in Bangalore via District',
              image_url: Array.isArray(item.image) ? item.image[0] : String(item.image || ''),
              location: String(item.location?.name || 'Bangalore'),
              datetime: item.startDate ? new Date(item.startDate) : undefined,
              price: item.offers?.price ? Number(item.offers.price) : 0,
              category: mapCategory(item.name),
              source_url,
              age_rating: 'ALL_AGES',
              source: 'district',
            });
          }
        }
      } catch { /* ignore */ }
    });

    // __NEXT_DATA__ embedded JSON fallback
    if (events.length === 0) {
      const nextData = $('script#__NEXT_DATA__').html();
      if (nextData) {
        try {
          const json = JSON.parse(nextData);
          const evList: unknown[] =
            json?.props?.pageProps?.events ||
            json?.props?.pageProps?.data?.events ||
            [];
          for (const item of evList) {
            const ev = item as Record<string, unknown>;
            const title = String(ev.name || ev.title || '').trim();
            if (!title) continue;
            const slug = String(ev.slug || ev.id || '');
            const source_url = String(ev.url || (slug ? `https://www.district.in/p/${slug}` : ''));
            if (!source_url) continue;
            events.push({
              title,
              description: String(ev.description || '').slice(0, 300) || 'Event via District',
              image_url: String((ev.cover_image as Record<string, unknown>)?.url || ev.image || ''),
              location: String((ev.venue as Record<string, unknown>)?.name || 'Bangalore'),
              datetime: ev.start_time ? new Date(Number(ev.start_time) * 1000) : undefined,
              price: Number(ev.min_price || 0),
              category: mapCategory(title),
              source_url,
              age_rating: 'ALL_AGES',
              source: 'district',
            });
          }
        } catch { /* ignore */ }
      }
    }
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number } };
    console.warn(`[District] HTTP ${e.response?.status || ''}: ${e.message}`);
  }

  return events.filter(e => e.title && e.source_url);
}

// Allevents.in — Indian event aggregator, JSON-LD and HTML fallback
async function tryAllevents(): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  try {
    const { data } = await axios.get('https://allevents.in/bangalore', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    // JSON-LD
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item['@type'] === 'Event' && item.name) {
            const source_url = String(item.url || '');
            if (!source_url) return;
            const d = item.startDate ? new Date(item.startDate) : undefined;
            events.push({
              title: String(item.name).trim(),
              description: String(item.description || '').slice(0, 300) || 'Event in Bangalore via Allevents.in',
              image_url: Array.isArray(item.image) ? item.image[0] : String(item.image || ''),
              location: String(item.location?.name || item.location?.address?.streetAddress || 'Bangalore'),
              datetime: d && !isNaN(d.getTime()) ? d : undefined,
              price: item.offers?.price ? Number(item.offers.price) : 0,
              category: mapCategory(String(item.name) + ' ' + String(item.description || '')),
              source_url,
              age_rating: 'ALL_AGES',
              source: 'allevents',
            });
          }
        }
      } catch { /* ignore */ }
    });

    // HTML card fallback
    if (events.length === 0) {
      const selectors = ['.event-item', '.event-card', '[class*="event-item"]', 'li[class*="event"]'];
      for (const sel of selectors) {
        const els = $(sel);
        if (els.length === 0) continue;
        els.each((_i, el) => {
          const $el = $(el);
          const title = $el.find('h2, h3, [class*="title"]').first().text().trim();
          if (!title || title.length < 3) return;
          const href = $el.find('a').first().attr('href') || '';
          const source_url = href.startsWith('http') ? href : href ? `https://allevents.in${href}` : '';
          if (!source_url) return;
          const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
          const venue = $el.find('[class*="venue"], [class*="location"]').first().text().trim() || 'Bangalore';
          const dateStr = $el.find('time, [class*="date"]').first().attr('datetime') || '';
          let datetime: Date | undefined;
          if (dateStr) { const d = new Date(dateStr); if (!isNaN(d.getTime())) datetime = d; }
          events.push({ title, description: 'Event in Bangalore via Allevents.in', image_url: img, location: venue, datetime, price: 0, category: mapCategory(title), source_url, age_rating: 'ALL_AGES', source: 'allevents' });
        });
        if (events.length > 0) break;
      }
    }
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number } };
    console.warn(`[District→Allevents] HTTP ${e.response?.status || ''}: ${e.message}`);
  }

  return events.filter(e => e.title && e.source_url);
}

export async function scrapeDistrict(): Promise<ScrapedEvent[]> {
  let events = await tryDistrict();
  if (events.length > 0) {
    console.log(`[District Scraper] Found ${events.length} events via District`);
    return events;
  }

  events = await tryAllevents();
  console.log(`[District Scraper] Found ${events.length} events via Allevents.in fallback`);
  return events;
}
