import { Router, Response } from 'express';
import Swipe from '../models/Swipe';
import Event from '../models/Card';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { nudgePreference, swipeLearningRate, PREF_MAX, PREF_MIN } from '../utils/preferences';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, direction, dwell_ms } = req.body || {};
    if (!eventId || !['left', 'right'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid payload: need eventId and direction (left/right)' });
    }

    const userId = req.userId!;
    const dwellMs = Number.isFinite(Number(dwell_ms)) ? Number(dwell_ms) : undefined;

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
        if (dwellMs !== undefined) existing.dwell_ms = dwellMs;
        await existing.save();
      } else {
        return res.json({ ok: true, message: 'Already swiped' });
      }
    } else {
      await Swipe.create({ user_id: userId, event_id: eventId, direction, dwell_ms: dwellMs ?? 0 });
    }

    // Update event count
    await Event.findByIdAndUpdate(eventId, {
      $inc: direction === 'right' ? { like_count: 1 } : { dislike_count: 1 }
    });

    // Update user preference vector — EMA toward like (2.0) or dislike (0.0),
    // with the learning rate scaled by how long the user considered the card.
    const user = await User.findById(userId);
    if (user && event.category) {
      const target = direction === 'right' ? PREF_MAX : PREF_MIN;
      const alpha = swipeLearningRate(direction, dwellMs);
      nudgePreference(user, event.category, target, alpha);
      await user.save();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Swipe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
