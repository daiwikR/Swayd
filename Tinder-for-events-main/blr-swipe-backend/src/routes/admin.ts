import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Event from '../models/Card';
import Swipe from '../models/Swipe';
import { runScraper, lastScrapedAt } from '../scrapers/scraper';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function signToken(userId: string, role: string) {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  return jwt.sign({ userId, role }, secret, { expiresIn: '30d' });
}

function setCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
}

// ─── Bootstrap (first-run, creates admin if none exists) ────────────────────

// POST /api/admin/bootstrap — creates first admin account (no auth required)
// Only works if zero admin accounts exist in the DB
router.post('/bootstrap', async (req: Request, res: Response) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(409).json({ error: 'Admin already exists. Use login.' });
    }

    const { email = 'admin@blr.com', password = 'admin123' } = req.body || {};

    const existing = await User.findOne({ email });
    if (existing) {
      // Promote existing user to admin
      existing.role = 'admin';
      await existing.save();
      const token = signToken(String(existing._id), 'admin');
      setCookie(res, token);
      return res.json({ ok: true, message: 'Existing user promoted to admin', email });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await User.create({
      email,
      password: hashed,
      role: 'admin',
      display_name: 'Admin',
      onboarding_complete: true,
      verified_age: 99
    });

    const token = signToken(String(admin._id), 'admin');
    setCookie(res, token);

    res.json({ ok: true, message: `Admin created: ${email}`, email });
  } catch (err: any) {
    res.status(500).json({ error: 'Bootstrap failed', detail: err.message });
  }
});

// ─── Stats ───────────────────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (_req, res: Response) => {
  try {
    const [totalUsers, totalEvents, totalSwipes, activeEvents, seekers, listers, scrapedEvents] =
      await Promise.all([
        User.countDocuments(),
        Event.countDocuments(),
        Swipe.countDocuments(),
        Event.countDocuments({ is_active: true }),
        User.countDocuments({ role: 'seeker' }),
        User.countDocuments({ role: 'lister' }),
        Event.countDocuments({ is_scraped: true })
      ]);
    res.json({
      totalUsers, totalEvents, totalSwipes, activeEvents, seekers, listers,
      scrapedEvents,
      lastScrapedAt: lastScrapedAt ? lastScrapedAt.toISOString() : null
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/scrape — manually trigger the event scraper
router.post('/scrape', requireAdmin, async (_req, res: Response) => {
  try {
    const result = await runScraper();
    res.json({ ok: true, ...result, lastScrapedAt: lastScrapedAt ? lastScrapedAt.toISOString() : null });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: 'Scraper failed', detail: e.message });
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', requireAdmin, async (_req, res: Response) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id — change role
router.patch('/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['seeker', 'lister', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await Swipe.deleteMany({ user_id: req.params.id });
    await Event.updateMany({ lister_id: req.params.id }, { is_active: false });
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Events ──────────────────────────────────────────────────────────────────

// GET /api/admin/events
router.get('/events', requireAdmin, async (_req, res: Response) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    const userIds = [...new Set(events.map(e => String(e.lister_id)))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('email display_name')
      .lean();
    const userMap = Object.fromEntries(
      users.map(u => [String(u._id), u.email])
    );
    const enriched = events.map(e => ({
      ...e,
      lister_email: userMap[String(e.lister_id)] || 'unknown'
    }));
    res.json({ events: enriched });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/events/:id
router.delete('/events/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await Swipe.deleteMany({ event_id: req.params.id });
    await Event.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/events/:id/toggle — toggle is_active
router.patch('/events/:id/toggle', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    event.is_active = !event.is_active;
    await event.save();
    res.json({ ok: true, is_active: event.is_active });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Seed Data ───────────────────────────────────────────────────────────────

// POST /api/admin/seed — create demo events and lister account
router.post('/seed', requireAdmin, async (_req, res: Response) => {
  try {
    // Create or find seed lister
    let lister = await User.findOne({ email: 'lister@blr.com' });
    if (!lister) {
      lister = await User.create({
        email: 'lister@blr.com',
        password: await bcrypt.hash('lister123', 10),
        role: 'lister',
        display_name: 'BLR Events Co',
        onboarding_complete: true,
        verified_age: 28
      });
    }

    // Remove previous seed events
    await Event.deleteMany({ lister_id: lister._id });

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const seedEvents = [
      {
        title: 'Iron Arena Crossfit Challenge',
        description: 'Push your limits at our signature crossfit competition. All levels welcome. Prizes for top 3 finishers.',
        category: 'fitness',
        datetime: new Date(now.getTime() + 2 * day),
        location: 'Koramangala Indoor Stadium',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
        price: 299,
        capacity: 60,
        age_rating: 'ALL_AGES',
        like_count: 47
      },
      {
        title: 'Bangalore Blues Night',
        description: 'An intimate evening of live blues, jazz, and soul music. Featuring 3 local bands and an open jam session.',
        category: 'music',
        datetime: new Date(now.getTime() + 3 * day),
        location: 'Indiranagar Blues Bar',
        image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
        price: 499,
        capacity: 150,
        age_rating: '18+',
        like_count: 89
      },
      {
        title: 'BLR DevFest 2025',
        description: "Bangalore's biggest developer festival. Talks on AI, Web3, mobile dev, and devops. 20+ speakers.",
        category: 'tech',
        datetime: new Date(now.getTime() + 5 * day),
        location: 'NIMHANS Convention Centre',
        image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
        price: 0,
        capacity: 500,
        age_rating: 'ALL_AGES',
        like_count: 203
      },
      {
        title: 'Street Food Safari: Indiranagar',
        description: "A guided walking tour through Indiranagar's best street food stalls. Includes 12 tastings and local history.",
        category: 'food',
        datetime: new Date(now.getTime() + 1 * day),
        location: '100 Feet Road, Indiranagar',
        image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
        price: 799,
        capacity: 20,
        age_rating: 'ALL_AGES',
        like_count: 156
      },
      {
        title: 'Canvas & Cocktails',
        description: 'Paint, sip, and create. A guided painting session with your choice of cocktails. No experience needed.',
        category: 'art',
        datetime: new Date(now.getTime() + 4 * day),
        location: 'White Canvas Gallery, MG Road',
        image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80',
        price: 1299,
        capacity: 30,
        age_rating: '18+',
        like_count: 112
      },
      {
        title: 'Underground Techno Night',
        description: 'Three floors. Six DJs. One night to remember. Doors open at 10pm. No cameras.',
        category: 'nightlife',
        datetime: new Date(now.getTime() + 6 * day),
        location: 'Tin & Tonic, Whitefield',
        image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
        price: 1499,
        capacity: 200,
        age_rating: '21+',
        like_count: 334
      },
      {
        title: 'Sunday Cricket League',
        description: 'Join our Sunday morning T10 cricket league. Teams of 8-10. Professional turf. All gear provided.',
        category: 'sports',
        datetime: new Date(now.getTime() + 7 * day),
        location: 'Chinnaswamy Stadium Turf',
        image_url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80',
        price: 199,
        capacity: 80,
        age_rating: 'ALL_AGES',
        like_count: 78
      },
      {
        title: 'Sunrise Yoga at Cubbon Park',
        description: 'Start your week right. 90-minute flow yoga session in the open air. Mats and chai provided.',
        category: 'wellness',
        datetime: new Date(now.getTime() + 8 * day),
        location: 'Cubbon Park, Entry Gate 2',
        image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
        price: 0,
        capacity: 40,
        age_rating: 'ALL_AGES',
        like_count: 91
      },
      {
        title: 'Stand-up Unlimited: English Edition',
        description: "Five of Bangalore's sharpest comics. 90 minutes of unfiltered comedy. Adults only.",
        category: 'comedy',
        datetime: new Date(now.getTime() + 9 * day),
        location: 'Canvas Laugh Club, UB City',
        image_url: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&q=80',
        price: 599,
        capacity: 120,
        age_rating: '18+',
        like_count: 167
      },
      {
        title: 'Founders Mixer Koramangala',
        description: "Connect with Bangalore's startup ecosystem. 50+ founders expected. Structured networking + open bar.",
        category: 'networking',
        datetime: new Date(now.getTime() + 10 * day),
        location: 'WeWork, Koramangala',
        image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80',
        price: 999,
        capacity: 60,
        age_rating: 'ALL_AGES',
        like_count: 144
      }
    ];

    await Event.insertMany(
      seedEvents.map(e => ({ ...e, lister_id: lister!._id }))
    );

    res.json({
      ok: true,
      message: `Seeded ${seedEvents.length} events. Lister: lister@blr.com / lister123`
    });
  } catch (err: any) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Seed failed', detail: err.message });
  }
});

export default router;
