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

    // Fetch candidate events (unseen, age-appropriate, active)
    const events = await Event.find({
      age_rating: { $in: allowedRatings },
      _id: { $nin: swipedIds },
      is_active: true
    })
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean();

    // Score by preference vector
    const prefVector: Record<string, number> = Object.fromEntries(user.preference_vector || new Map());
    const hasPrefs = Object.keys(prefVector).length > 0;

    const scored = events.map(ev => ({
      ...ev,
      _score: hasPrefs ? (prefVector[ev.category] || 0) : 0
    }));

    if (hasPrefs) scored.sort((a, b) => b._score - a._score);

    // Exploration: 85% preference-ranked + 15% random discovery from low-affinity categories
    const mainCount = Math.ceil(limit * 0.85);
    const explorationCount = limit - mainCount;

    const mainCards = scored.slice(0, mainCount);

    // Pick exploration cards from low-affinity categories (score < 0.5) not already in mainCards
    const mainIds = new Set(mainCards.map(e => String(e._id)));
    const explorationPool = scored.filter(e =>
      !mainIds.has(String(e._id)) && (prefVector[e.category] || 0) < 0.5
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
      is_recommended: ev._score > 1.2
    }));

    res.json({ cards: result });
  } catch (err) {
    console.error('Cards fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
