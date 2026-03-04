import { Router, Response } from 'express';
import Event from '../models/Card';
import Swipe from '../models/Swipe';
import User from '../models/User';
import { requireAuth, requireLister, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/events — create event (lister only)
router.post('/', requireLister, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, image_url, location, category, datetime, price, capacity, age_rating } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Title required' });

    const event = await Event.create({
      lister_id: req.userId,
      title,
      description: description || '',
      image_url: image_url || '',
      location: location || 'Bangalore',
      category: category || 'other',
      datetime: datetime ? new Date(datetime) : undefined,
      price: Number(price) || 0,
      capacity: Number(capacity) || 0,
      age_rating: age_rating || 'ALL_AGES'
    });

    res.json({ ok: true, event });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/mine — lister's own events with swipe stats
router.get('/mine', requireLister, async (req: AuthRequest, res: Response) => {
  try {
    const events = await Event.find({ lister_id: req.userId }).sort({ createdAt: -1 }).lean();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/events/:id — update event (lister only, owns event)
router.patch('/:id', requireLister, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, lister_id: req.userId });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const fields = ['title', 'description', 'image_url', 'location', 'category', 'datetime', 'price', 'capacity', 'age_rating', 'is_active'];
    for (const f of fields) {
      if (req.body[f] !== undefined) (event as any)[f] = req.body[f];
    }
    await event.save();
    res.json({ ok: true, event });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', requireLister, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, lister_id: req.userId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id — single event (with age check)
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Age gate
    const userAge = user.verified_age || 0;
    const rating = event.age_rating;
    const blocked =
      (rating === '18+' && userAge < 18) ||
      (rating === '21+' && userAge < 21) ||
      (rating === '13+' && userAge < 13);

    if (blocked) {
      return res.status(403).json({ error: 'AGE_RESTRICTED', message: "This event isn't available for your age group" });
    }

    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
