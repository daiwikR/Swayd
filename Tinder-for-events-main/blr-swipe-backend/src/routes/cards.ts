import { Router, Response } from 'express';
import Event from '../models/Card';
import Swipe from '../models/Swipe';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/cards — smart ranked feed with age gating
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number((req.query.limit as string) || 20);
    const userId = req.userId!;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build age filter (enforce server-side — never trust client)
    const userAge = user.verified_age || 0;
    let allowedRatings: string[] = ['ALL_AGES'];
    if (userAge >= 21) allowedRatings = ['ALL_AGES', '13+', '18+', '21+'];
    else if (userAge >= 18) allowedRatings = ['ALL_AGES', '13+', '18+'];
    else if (userAge >= 13) allowedRatings = ['ALL_AGES', '13+'];

    // Get already-swiped event IDs
    const swipedIds = await Swipe.find({ user_id: userId }).distinct('event_id');

    // Fetch candidate events (unseen, age-appropriate, active, not in the past)
    const now = new Date();
    const events = await Event.find({
      age_rating: { $in: allowedRatings },
      _id: { $nin: swipedIds },
      is_active: true,
      $or: [{ datetime: { $gte: now } }, { datetime: null }, { datetime: { $exists: false } }]
    })
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean();

    const prefVector: Record<string, number> = Object.fromEntries(user.preference_vector || new Map());
    const hasPrefs = Object.keys(prefVector).length > 0;
    const timePref = user.preferences?.time || 'both';

    // Blended score per event:
    //   pref     — personal category affinity learned from swipes/RSVPs (0..1)
    //   quality  — Bayesian-smoothed like ratio across ALL users (lightweight
    //              collaborative signal; prior of 0.5 so new events aren't buried)
    //   urgency  — events happening soon surface first (2-week half-life-ish decay)
    //   schedule — matches the user's weekday/weekend onboarding preference
    const scored = events.map(ev => {
      const pref = (prefVector[ev.category] ?? 0) / 2;

      const likes = ev.like_count || 0;
      const dislikes = ev.dislike_count || 0;
      const quality = (likes + 3) / (likes + dislikes + 6);

      let urgency = 0.5;
      if (ev.datetime) {
        const days = (new Date(ev.datetime).getTime() - now.getTime()) / 86400000;
        urgency = days <= 0 ? 0.2 : Math.exp(-days / 14);
      }

      let schedule = 0.5;
      if (ev.datetime && timePref !== 'both') {
        const day = new Date(ev.datetime).getDay();
        const isWeekend = day === 0 || day === 6;
        schedule = (timePref === 'weekends') === isWeekend ? 1 : 0;
      }

      const _score = hasPrefs
        ? 0.55 * pref + 0.2 * quality + 0.15 * urgency + 0.1 * schedule
        : 0.5 * quality + 0.35 * urgency + 0.15 * schedule; // cold start: popularity + urgency

      return { ...ev, _score, _prefWeight: prefVector[ev.category] ?? 0 };
    });

    scored.sort((a, b) => b._score - a._score);

    // Exploration: 85% ranked + 15% random discovery from low-affinity categories
    const mainCount = Math.ceil(limit * 0.85);
    const explorationCount = limit - mainCount;

    const mainCards = scored.slice(0, mainCount);

    // Pick exploration cards from low-affinity categories not already in mainCards
    const mainIds = new Set(mainCards.map(e => String(e._id)));
    const explorationPool = scored.filter(e =>
      !mainIds.has(String(e._id)) && e._prefWeight < 0.5
    );
    // Shuffle exploration pool
    for (let i = explorationPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [explorationPool[i], explorationPool[j]] = [explorationPool[j], explorationPool[i]];
    }
    const explorationCards = explorationPool.slice(0, explorationCount);

    // Interleave: insert exploration every ~6 cards
    const combined: typeof scored = [];
    let expIdx = 0;
    for (let i = 0; i < mainCards.length; i++) {
      combined.push(mainCards[i]);
      if ((i + 1) % 6 === 0 && expIdx < explorationCards.length) {
        combined.push(explorationCards[expIdx++]);
      }
    }
    while (expIdx < explorationCards.length) combined.push(explorationCards[expIdx++]);

    const result = combined.slice(0, limit).map(ev => ({
      _id: ev._id,
      title: ev.title,
      description: ev.description,
      category: ev.category,
      datetime: ev.datetime,
      location: ev.location,
      image_url: ev.image_url,
      price: ev.price,
      capacity: ev.capacity,
      age_rating: ev.age_rating,
      like_count: ev.like_count,
      source_url: ev.source_url || '',
      source: ev.source || 'manual',
      rsvp_enabled: ev.rsvp_enabled || false,
      rsvp_form: ev.rsvp_form || [],
      is_recommended: ev._prefWeight > 1.2 || ev._score > 0.72
    }));

    res.json({ cards: result });
  } catch (err) {
    console.error('Cards fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
