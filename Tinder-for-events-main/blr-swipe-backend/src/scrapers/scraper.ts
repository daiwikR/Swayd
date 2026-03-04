import User from '../models/User';
import Event from '../models/Card';
import { scrapeBookMyShow } from './bookMyShow';
import { scrapeDistrict } from './district';
import type { EventSource } from '../models/Card';

export let lastScrapedAt: Date | null = null;

// Find or create the system bot user (lister) used as lister_id for scraped events
async function getOrCreateBotUser(): Promise<string> {
  const botEmail = 'scraper-bot@blr.internal';
  let bot = await User.findOne({ email: botEmail });
  if (!bot) {
    const bcrypt = await import('bcryptjs');
    bot = await User.create({
      email: botEmail,
      password: await bcrypt.hash(Math.random().toString(36), 10),
      role: 'lister',
      display_name: 'BLR Scraper Bot',
      onboarding_complete: true,
    });
    console.log('[Scraper] Created bot user:', botEmail);
  }
  return String(bot._id);
}

interface UpsertResult {
  added: number;
  skipped: number;
  errors: string[];
}

async function upsertEvents(
  events: (Awaited<ReturnType<typeof scrapeBookMyShow>> | Awaited<ReturnType<typeof scrapeDistrict>>)[number][],
  defaultSource: EventSource,
  botId: string,
): Promise<UpsertResult> {
  let added = 0, skipped = 0;
  const errors: string[] = [];

  for (const ev of events) {
    try {
      if (!ev.source_url) { skipped++; continue; }

      const existing = await Event.findOne({ source_url: ev.source_url });
      if (existing) { skipped++; continue; }

      // Use ev.source if the scraper set it (district/allevents), else use the default
      const eventSource: EventSource = ('source' in ev && ev.source) ? (ev.source as EventSource) : defaultSource;

      await Event.create({
        lister_id: botId,
        title: ev.title,
        description: ev.description,
        category: ev.category,
        datetime: ev.datetime,
        location: ev.location,
        image_url: ev.image_url,
        price: ev.price,
        capacity: 0,
        age_rating: ev.age_rating,
        source_url: ev.source_url,
        source: eventSource,
        is_scraped: true,
        is_active: true,
      });
      added++;
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 11000) { skipped++; }
      else { errors.push(ev.title + ': ' + (e.message || 'unknown error')); }
    }
  }
  return { added, skipped, errors };
}

export async function runScraper(): Promise<{ added: number; skipped: number; sources: string[] }> {
  console.log('[Scraper] Running at', new Date().toISOString());
  let totalAdded = 0, totalSkipped = 0;
  const sources: string[] = [];

  try {
    const botId = await getOrCreateBotUser();

    const [bmsEvents, districtEvents] = await Promise.allSettled([
      scrapeBookMyShow(),
      scrapeDistrict(),
    ]);

    if (bmsEvents.status === 'fulfilled' && bmsEvents.value.length > 0) {
      const r = await upsertEvents(bmsEvents.value, 'bookmyshow', botId);
      totalAdded += r.added;
      totalSkipped += r.skipped;
      sources.push(`BookMyShow: +${r.added}`);
      console.log(`[Scraper] BMS: +${r.added} added, ${r.skipped} skipped`);
    } else {
      console.warn('[Scraper] BMS: no events scraped');
      sources.push('BookMyShow: 0');
    }

    if (districtEvents.status === 'fulfilled' && districtEvents.value.length > 0) {
      const r = await upsertEvents(districtEvents.value, 'district', botId);
      totalAdded += r.added;
      totalSkipped += r.skipped;
      sources.push(`District: +${r.added}`);
      console.log(`[Scraper] District: +${r.added} added, ${r.skipped} skipped`);
    } else {
      console.warn('[Scraper] District: no events scraped');
      sources.push('District: 0');
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[Scraper] Fatal error:', e.message);
  }

  lastScrapedAt = new Date();
  console.log(`[Scraper] Done. Total: +${totalAdded} added, ${totalSkipped} skipped`);
  return { added: totalAdded, skipped: totalSkipped, sources };
}

/** Schedule the scraper to run every `intervalMs` (default: 6 hours) */
export function scheduleScraper(intervalMs = 6 * 60 * 60 * 1000) {
  // Run once at startup (after a short delay to let DB connect)
  setTimeout(() => {
    runScraper().catch(err => console.error('[Scraper] Startup run failed:', err));
  }, 5000);

  // Then run on interval
  setInterval(() => {
    runScraper().catch(err => console.error('[Scraper] Scheduled run failed:', err));
  }, intervalMs);

  console.log(`[Scraper] Scheduled every ${intervalMs / 1000 / 60} minutes`);
}
