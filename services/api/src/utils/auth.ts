// services/api/src/utils/auth.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction, CookieOptions } from 'express';

export const ADMIN_COOKIE  = 'admin_auth';
export const MEMBER_COOKIE = 'member_auth';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const IS_PROD = process.env.NODE_ENV === 'production';

// Type-safe sameSite value for prod/non-prod
const SAME_SITE: Exclude<CookieOptions['sameSite'], boolean | 'strict'> =
  IS_PROD ? 'none' : 'lax';

const baseCookie: CookieOptions = {
  httpOnly: true,
  path: '/',
  secure: IS_PROD,                 // true on Render (HTTPS)
  sameSite: SAME_SITE,             // 'none' in prod, 'lax' in dev
  domain: process.env.COOKIE_DOMAIN || undefined,
};

export function signToken(payload: object, days = 7) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${days}d` });
}

export function setAuthCookie(res: Response, token: string, cookieName: string, days = 7) {
  res.cookie(cookieName, token, {
    ...baseCookie,
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response, cookieName: string) {
  // Use the same attributes when clearing so the browser actually removes it
  res.cookie(cookieName, '', {
    ...baseCookie,
    maxAge: 0,
    expires: new Date(0),
  });
}

export interface AuthedRequest extends Request {
  auth?: { sub: string; role?: 'admin' | 'member' };
}

export function readAuth(cookieName: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const raw = req.cookies?.[cookieName];
      const bearer =
        req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : undefined;

      const token = raw || bearer;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.auth = { sub: String(decoded.sub), role: decoded.role };
      }
    } catch {
      // ignore invalid/missing token
    }
    next();
  };
}

export function requireRole(role: 'admin' | 'member') {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    if (req.auth.role !== role) return res.status(403).json({ error: `${role}s only` });
    next();
  };
}
