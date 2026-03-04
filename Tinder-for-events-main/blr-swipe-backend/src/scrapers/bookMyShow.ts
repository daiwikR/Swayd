import axios from 'axios';
import * as cheerio from 'cheerio';
import type { EventCategory } from '../models/Card';

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
}

function mapCategory(text: string): EventCategory {
  const t = text.toLowerCase();
  if (t.includes('music') || t.includes('concert') || t.includes('live')) return 'music';
  if (t.includes('comedy') || t.includes('stand-up') || t.includes('standup')) return 'comedy';
  if (t.includes('tech') || t.includes('workshop') || t.includes('seminar') || t.includes('startup')) return 'tech';
  if (t.includes('food') || t.includes('culinary') || t.includes('cuisine') || t.includes('dining')) return 'food';
  if (t.includes('art') || t.includes('exhibit') || t.includes('gallery') || t.includes('theatre')) return 'art';
  if (t.includes('sport') || t.includes('cricket') || t.includes('football') || t.includes('run')) return 'sports';
  if (t.includes('fitness') || t.includes('yoga') || t.includes('gym') || t.includes('zumba')) return 'fitness';
  if (t.includes('wellness') || t.includes('meditat') || t.includes('mental')) return 'wellness';
  if (t.includes('night') || t.includes('party') || t.includes('club') || t.includes('dj')) return 'nightlife';
  if (t.includes('network') || t.includes('meetup') || t.includes('conference')) return 'networking';
  return 'other';
}

// BMS internal path-based API (api.bms is a path prefix, not a subdomain)
// These are the actual endpoints their web frontend calls
const BMS_ENDPOINTS = [
  'https://in.bookmyshow.com/api.bms/FE/Home/GetEventList?regionCode=BANG&category=ALL&pageIndex=0',
  'https://in.bookmyshow.com/serv/getData?cmd=EVENTS&region=BANG&category=ALL&pageNumber=1&pageSize=40',
];

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*',
  'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
  'Referer': 'https://in.bookmyshow.com/explore/events-bengaluru',
  'Origin': 'https://in.bookmyshow.com',
  'x-bms-client': 'web',
  'x-region-code': 'BANG',
  'x-region-slug': 'bengaluru',
};

async function tryBmsApi(): Promise<ScrapedEvent[]> {
  for (const url of BMS_ENDPOINTS) {
    try {
      const { data } = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 10000 });
      const rawList: unknown[] =
        data?.BookMyShow?.arrEvents ||
        data?.arrEvents ||
        data?.events ||
        data?.EventDetails ||
        (Array.isArray(data) ? data : []);
      if (!rawList || rawList.length === 0) continue;

      const events: ScrapedEvent[] = [];
      for (const item of rawList) {
        const ev = item as Record<string, unknown>;
        const title = String(ev.EventTitle || ev.title || ev.EventName || '').trim();
        if (!title || title.length < 3) continue;
        const code = String(ev.EventCode || ev.Code || ev.eventCode || '');
        const source_url = code
          ? `https://in.bookmyshow.com/buytickets/${code}/event`
          : String(ev.EventURL || ev.url || '');
        if (!source_url || !source_url.startsWith('http')) continue;
        events.push({
          title,
          description: String(ev.EventDescription || ev.description || '').slice(0, 300) || 'Event in Bangalore via BookMyShow',
          image_url: String(ev.EventImageURL || ev.ImageURL || ev.imageUrl || ''),
          location: String(ev.VenueName || (ev.VenueInfo as Record<string, unknown>)?.Name || ev.venue || 'Bangalore'),
          datetime: ev.EventDate ? (() => { const d = new Date(String(ev.EventDate)); return isNaN(d.getTime()) ? undefined : d; })() : undefined,
          price: (() => { const m = String(ev.MinPrice || ev.price || '0').match(/[\d]+/); return m ? parseInt(m[0]) : 0; })(),
          category: mapCategory(String(ev.EventGenre || ev.genre || '') + ' ' + title),
          source_url,
          age_rating: 'ALL_AGES',
        });
      }
      if (events.length > 0) return events;
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { status?: number } };
      const status = e.response?.status ? ` (HTTP ${e.response.status})` : '';
      console.warn(`[BMS] ${url.split('?')[0]}${status}: ${e.message}`);
    }
  }
  return [];
}

// Eventbrite India — parses __NEXT_DATA__ JSON embedded in the page
async function tryEventbriteIndia(): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  try {
    const { data } = await axios.get(
      'https://www.eventbrite.co.in/d/india--bangalore/events/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
        timeout: 15000,
      }
    );

    const $ = cheerio.load(data);

    // Eventbrite embeds event JSON in <script id="__NEXT_DATA__">
    const nextDataText = $('script#__NEXT_DATA__').html();
    if (nextDataText) {
      const json = JSON.parse(nextDataText);
      const results: unknown[] =
        json?.props?.pageProps?.serverState?.eventSearch?.events?.results ||
        json?.props?.pageProps?.initialData?.events ||
        json?.props?.pageProps?.events ||
        [];
      for (const item of results.slice(0, 30)) {
        const ev = item as Record<string, unknown>;
        const title = String(ev.name || ev.title || '').trim();
        if (!title) continue;
        const source_url = String(ev.url || ev.eventUrl || '');
        if (!source_url) continue;
        const imgObj = ev.image as Record<string, unknown> | undefined;
        events.push({
          title,
          description: String(ev.summary || ev.description || '').slice(0, 300) || 'Event in Bangalore via Eventbrite',
          image_url: String(imgObj?.url || (imgObj?.original as Record<string, unknown>)?.url || ''),
          location: String((ev.primary_venue as Record<string, unknown>)?.name || ev.venue_name || 'Bangalore'),
          datetime: ev.start_date ? (() => { const d = new Date(String(ev.start_date)); return isNaN(d.getTime()) ? undefined : d; })() : undefined,
          price: 0,
          category: mapCategory(title),
          source_url,
          age_rating: 'ALL_AGES',
        });
      }
    }

    // JSON-LD fallback
    if (events.length === 0) {
      $('script[type="application/ld+json"]').each((_i, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          const items = Array.isArray(json) ? json : [json];
          for (const item of items) {
            if (item['@type'] === 'Event' && item.name) {
              events.push({
                title: item.name,
                description: String(item.description || '').slice(0, 300) || 'Event in Bangalore',
                image_url: Array.isArray(item.image) ? item.image[0] : (item.image || ''),
                location: item.location?.name || 'Bangalore',
                datetime: item.startDate ? new Date(item.startDate) : undefined,
                price: item.offers?.price ? Number(item.offers.price) : 0,
                category: mapCategory(item.name),
                source_url: item.url || '',
                age_rating: 'ALL_AGES',
              });
            }
          }
        } catch { /* ignore */ }
      });
    }
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number } };
    console.warn(`[BMS→Eventbrite fallback] HTTP ${e.response?.status || ''}: ${e.message}`);
  }
  return events.filter(e => e.title && e.source_url);
}

export async function scrapeBookMyShow(): Promise<ScrapedEvent[]> {
  // Try BMS internal API first
  let events = await tryBmsApi();
  if (events.length > 0) {
    console.log(`[BMS Scraper] Found ${events.length} events via BMS API`);
    return events.filter(e => e.title && e.source_url);
  }

  // Fall back to Eventbrite India
  events = await tryEventbriteIndia();
  console.log(`[BMS Scraper] Found ${events.length} events via Eventbrite fallback`);
  return events;
}
