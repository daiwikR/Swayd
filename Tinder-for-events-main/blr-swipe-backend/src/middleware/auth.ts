import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const payload = jwt.verify(token, secret) as { userId: string; role: string };
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireLister(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.userRole !== 'lister' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Lister access only' });
    }
    next();
  });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    next();
  });
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret';
      const payload = jwt.verify(token, secret) as { userId: string; role: string };
      req.userId = payload.userId;
      req.userRole = payload.role;
    } catch {
      // ignore — just proceed without user
    }
  }
  next();
}
