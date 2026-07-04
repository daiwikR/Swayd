import app from './app';
import { connectDB } from './db';
import { scheduleScraper } from './scrapers/scraper';

// Standalone server entry (local dev / VPS). On Vercel the app is served
// from api/index.ts instead and the scraper runs via Vercel Cron.
const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  connectDB()
    .then(() => {
      // Start the event scraper (runs once on startup, then every 6h)
      scheduleScraper();
    })
    .catch(() => {
      console.error('[DB] Will keep retrying on next requests.');
    });
});
