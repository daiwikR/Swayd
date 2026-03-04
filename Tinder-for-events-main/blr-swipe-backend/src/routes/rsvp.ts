import { Router, Response } from 'express';
import Event from '../models/Card';
import RSVP from '../models/RSVP';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/** Generate a random 6-char alphanumeric seat code */
function genSeatCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/rsvp — seeker RSVPs for an event
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, answers } = req.body as { eventId: string; answers: Record<string, string> };
    if (!eventId) return res.status(400).json({ error: 'eventId required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.rsvp_enabled) return res.status(400).json({ error: 'This event does not have RSVP' });

    // Check capacity
    if (event.capacity > 0) {
      const count = await RSVP.countDocuments({ event_id: eventId, status: 'confirmed' });
      if (count >= event.capacity) {
        return res.status(409).json({ error: 'Event is at full capacity' });
      }
    }

    // Check if already RSVPed
    const existing = await RSVP.findOne({ event_id: eventId, user_id: req.userId });
    if (existing) {
      if (existing.status === 'confirmed') {
        return res.json({
          ok: true,
          rsvp: existing,
          seat_code: existing.seat_code,
          already_rsvped: true,
        });
      }
      // Re-confirm cancelled RSVP
      existing.status = 'confirmed';
      existing.answers = answers || {} as Record<string, string>;
      existing.markModified('answers');
      await existing.save();
      return res.json({ ok: true, rsvp: existing, seat_code: existing.seat_code });
    }

    const seat_code = genSeatCode();
    const rsvp = await RSVP.create({
      event_id: eventId,
      user_id: req.userId,
      answers: answers || {},
      seat_code,
      status: 'confirmed',
    });

    res.json({ ok: true, rsvp, seat_code });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      return res.status(409).json({ error: 'Already RSVPed for this event' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rsvp/my — list current user's RSVPs
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rsvps = await RSVP.find({ user_id: req.userId, status: 'confirmed' })
      .populate('event_id')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ rsvps });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rsvp/event/:eventId — lister sees all RSVPs for their event
router.get('/event/:eventId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Only the lister who owns the event (or admin) can see attendees
    if (String(event.lister_id) !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rsvps = await RSVP.find({ event_id: req.params.eventId, status: 'confirmed' })
      .populate('user_id', 'email display_name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      event: { title: event.title, capacity: event.capacity },
      confirmed_count: rsvps.length,
      rsvps,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/rsvp/:rsvpId — cancel an RSVP
router.delete('/:rsvpId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rsvp = await RSVP.findById(req.params.rsvpId);
    if (!rsvp) return res.status(404).json({ error: 'RSVP not found' });
    if (String(rsvp.user_id) !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    rsvp.status = 'cancelled';
    await rsvp.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
