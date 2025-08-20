import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
export const ADMIN_COOKIE = 'admin_auth';
export const MEMBER_COOKIE = 'member_auth';

export function signToken(payload: object, days = 7) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${days}d` });
}

export function setAuthCookie(res: Response, token: string, cookieName: string) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set true behind HTTPS in prod
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response, cookieName: string) {
  res.clearCookie(cookieName, { path: '/' });
}

export interface AuthedRequest extends Request {
  auth?: { sub: string; role?: 'admin'|'member' };
}

export function readAuth(cookieName: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const raw = req.cookies?.[cookieName];
      if (!raw) return next();
      const decoded = jwt.verify(raw, JWT_SECRET) as any;
      req.auth = { sub: decoded.sub, role: decoded.role };
    } catch { /* ignore */ }
    next();
  };
}

export function requireRole(role: 'admin'|'member') {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    if (req.auth.role !== role) return res.status(403).json({ error: `${role}s only` });
    next();
  };
}
