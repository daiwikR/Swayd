import { Request, Response } from 'express';
import crypto from 'crypto';

const COOKIE_NAME = 'uid';

export function getOrCreateUserId(req: Request, res: Response) {
  let uid = req.cookies?.[COOKIE_NAME];
  if (!uid) {
    uid = crypto.randomUUID();
    res.cookie(COOKIE_NAME, uid, {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
  }
  return uid;
}
