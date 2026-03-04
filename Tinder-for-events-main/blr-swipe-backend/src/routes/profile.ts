import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Swipe from '../models/Swipe';
import Event from '../models/Card';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

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

// GET /api/profile — user profile + liked/disliked events
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rightSwipes = await Swipe.find({ user_id: userId, direction: 'right' }).sort({ timestamp: -1 }).lean();
    const leftSwipes = await Swipe.find({ user_id: userId, direction: 'left' }).sort({ timestamp: -1 }).lean();

    const [likes, dislikes] = await Promise.all([
      Event.find({ _id: { $in: rightSwipes.map(s => s.event_id) } }).lean(),
      Event.find({ _id: { $in: leftSwipes.map(s => s.event_id) } }).lean()
    ]);

    const now = new Date();
    const upcoming = likes.filter(e => e.datetime && new Date(e.datetime) > now);

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url || '',
        role: user.role,
        preferences: user.preferences,
        preference_vector: Object.fromEntries(user.preference_vector || new Map()),
        onboarding_complete: user.onboarding_complete
      },
      likes,
      upcoming,
      dislikes
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/profile — update display_name and/or avatar_url
router.patch('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { display_name, avatar_url } = req.body || {};
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (display_name !== undefined) user.display_name = String(display_name).trim().slice(0, 60);
    if (avatar_url !== undefined) user.avatar_url = String(avatar_url).slice(0, 500);
    await user.save();

    res.json({
      ok: true,
      user: {
        _id: user._id,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      }
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/change-password
router.post('/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(String(currentPassword), user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/reset-preferences
router.post('/reset-preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.preference_vector = new Map();
    user.preferences = { categories: [], format: 'both', time: 'both' };
    user.onboarding_complete = false;
    await user.save();

    // Re-issue JWT so the app re-triggers onboarding flow
    const token = signToken(String(user._id), user.role);
    setCookie(res, token);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/onboarding — save onboarding preferences
router.post('/onboarding', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { categories, format, time } = req.body || {};
    if (!categories || !Array.isArray(categories) || categories.length < 3) {
      return res.status(400).json({ error: 'Select at least 3 interest categories' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pv = new Map<string, number>();
    for (const cat of categories) pv.set(cat, 1.0);

    user.preferences = { categories, format: format || 'both', time: time || 'both' };
    user.preference_vector = pv;
    user.onboarding_complete = true;
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/switch-to-lister — seeker upgrades to lister role
router.post('/switch-to-lister', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'seeker') {
      return res.status(400).json({ error: 'Already a lister or admin' });
    }

    user.role = 'lister' as any;
    user.onboarding_complete = true;
    await user.save();

    // Re-issue JWT with new role
    const token = signToken(String(user._id), 'lister');
    setCookie(res, token);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/switch-to-seeker — lister downgrades to seeker role
router.post('/switch-to-seeker', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'lister') {
      return res.status(400).json({ error: 'Only listers can switch to seeker' });
    }

    user.role = 'seeker' as any;
    await user.save();

    // Re-issue JWT with new role
    const token = signToken(String(user._id), 'seeker');
    setCookie(res, token);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/profile/swipes/:eventId — remove a swipe
router.delete('/swipes/:eventId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { eventId } = req.params;

    const swipe = await Swipe.findOne({ user_id: userId, event_id: eventId });
    if (!swipe) return res.status(404).json({ error: 'Swipe not found' });

    await Event.findByIdAndUpdate(eventId, {
      $inc: swipe.direction === 'right' ? { like_count: -1 } : { dislike_count: -1 }
    });

    await swipe.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
