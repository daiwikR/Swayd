import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './db';

import authRoute from './routes/auth';
import cardsRoute from './routes/cards';
import swipeRoute from './routes/swipe';
import profileRoute from './routes/profile';
import eventsRoute from './routes/events';
import adminRoute from './routes/admin';
import rsvpRoute from './routes/rsvp';
import { runScraper } from './scrapers/scraper';

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// In production on Vercel the frontend and API share one origin, so CORS only
// matters for local dev and split-host setups.
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));

// Ensure a DB connection before handling any request. On a long-running server
// this is a no-op after boot; on serverless it connects (and caches) per instance.
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB] Connection failed while handling request:', err);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Vercel Cron hits this every 6h (see vercel.json). Vercel automatically sends
// "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
app.get('/api/cron/scrape', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await runScraper();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[Cron] Scrape failed:', err);
    res.status(500).json({ error: 'Scrape failed' });
  }
});

app.use('/api/auth', authRoute);
app.use('/api/cards', cardsRoute);
app.use('/api/swipe', swipeRoute);
app.use('/api/profile', profileRoute);
app.use('/api/events', eventsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/rsvp', rsvpRoute);

export default app;
