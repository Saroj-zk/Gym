import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.js'; // ESM: default import + .js

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function auth(required = true, roles: string[] = []) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;

      // Support tokens that use `sub` (common) or `id`
      const id = payload?.sub ?? payload?.id;
      const role = payload?.role;

      if (!id || !role) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = { id, role };

      if (roles.length && !roles.includes(role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
