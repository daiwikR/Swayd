import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function calcAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

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

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, role, date_of_birth, display_name } = req.body || {};

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password and role are required' });
    }
    if (!['seeker', 'lister'].includes(role)) {
      return res.status(400).json({ error: 'Role must be seeker or lister' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    let verified_age = 0;
    let dob: Date | undefined;

    if (role === 'seeker') {
      if (!date_of_birth) {
        return res.status(400).json({ error: 'Date of birth is required for seekers' });
      }
      dob = new Date(date_of_birth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ error: 'Invalid date of birth' });
      }
      verified_age = calcAge(dob);
      if (verified_age < 13) {
        return res.status(403).json({ error: 'AGE_RESTRICTED', message: 'This app is for teens and adults.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      display_name: display_name || email.split('@')[0],
      date_of_birth: dob,
      verified_age,
      onboarding_complete: role === 'lister' // listers skip onboarding
    });

    const token = signToken(String(user._id), user.role);
    setCookie(res, token);

    res.json({
      ok: true,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        verified_age: user.verified_age,
        onboarding_complete: user.onboarding_complete
      }
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Recalculate age server-side on login
    if (user.date_of_birth) {
      user.verified_age = calcAge(user.date_of_birth);
      await user.save();
    }

    const token = signToken(String(user._id), user.role);
    setCookie(res, token);

    res.json({
      ok: true,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        verified_age: user.verified_age,
        onboarding_complete: user.onboarding_complete,
        preference_vector: Object.fromEntries(user.preference_vector || new Map()),
        preferences: user.preferences
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        verified_age: user.verified_age,
        onboarding_complete: user.onboarding_complete,
        preference_vector: Object.fromEntries(user.preference_vector || new Map()),
        preferences: user.preferences
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
