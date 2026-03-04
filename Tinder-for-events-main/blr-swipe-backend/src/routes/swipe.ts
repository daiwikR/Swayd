import { Router, Response } from 'express';
import Swipe from '../models/Swipe';
import Event from '../models/Card';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const PREF_RIGHT_DELTA = 0.1;
const PREF_LEFT_DELTA = -0.05;
const PREF_MAX = 2.0;
const PREF_MIN = 0.0;

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, direction } = req.body || {};
    if (!eventId || !['left', 'right'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid payload: need eventId and direction (left/right)' });
    }

    const userId = req.userId!;

    // Check event exists
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Check if already swiped
    const existing = await Swipe.findOne({ user_id: userId, event_id: eventId });
    if (existing) {
      // Update direction if changed
      if (existing.direction !== direction) {
        // Undo old count
        await Event.findByIdAndUpdate(eventId, {
          $inc: existing.direction === 'right' ? { like_count: -1 } : { dislike_count: -1 }
        });
        existing.direction = direction;
        await existing.save();
      } else {
        return res.json({ ok: true, message: 'Already swiped' });
      }
    } else {
      await Swipe.create({ user_id: userId, event_id: eventId, direction });
    }

    // Update event count
    await Event.findByIdAndUpdate(eventId, {
      $inc: direction === 'right' ? { like_count: 1 } : { dislike_count: 1 }
    });

    // Update user preference vector
    const user = await User.findById(userId);
    if (user && event.category) {
      const pv: Map<string, number> = user.preference_vector || new Map();
      const current = pv.get(event.category) || 0;
      const delta = direction === 'right' ? PREF_RIGHT_DELTA : PREF_LEFT_DELTA;
      const updated = Math.min(PREF_MAX, Math.max(PREF_MIN, current + delta));
      pv.set(event.category, updated);
      user.preference_vector = pv;
      await user.save();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Swipe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
