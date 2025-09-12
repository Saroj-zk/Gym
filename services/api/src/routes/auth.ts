import { Router } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import {
  ADMIN_COOKIE,
  MEMBER_COOKIE,
  setAuthCookie,
  clearAuthCookie,
  signToken,
  readAuth,
  requireRole,
  type AuthedRequest,
} from '../utils/auth.js';

// Narrow type for lean user objects we read from Mongo
type IUserLean = {
  _id: any;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  role: 'admin' | 'member';
  passwordHash?: string; // only when explicitly selected
};

const router = Router();

/** ------------------ ADMIN AUTH (kiosk/staff) ------------------ **/

// POST /auth/admin/login  { email? | userId?, password }
router.post('/admin/login', async (req, res) => {
  const { email, userId, password } = req.body || {};
  if (!password || (!email && !userId)) {
    return res
      .status(400)
      .json({ error: 'Email/User ID and password required' });
  }

  const q: any = { role: 'admin' };
  if (email) q.email = String(email).toLowerCase();
  if (userId) q.userId = String(userId);

  const user = (await User.findOne(q)
    .select('+passwordHash')
    .lean()) as IUserLean | null;

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(
    String(password),
    String(user.passwordHash)
  );
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ sub: String(user._id), role: 'admin' });
  setAuthCookie(res, token, ADMIN_COOKIE);

  res.json({
    ok: true,
    user: {
      _id: user._id,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: 'admin',
    },
  });
});

router.post('/admin/logout', (_req, res) => {
  clearAuthCookie(res, ADMIN_COOKIE);
  res.json({ ok: true });
});

router.get(
  '/admin/me',
  readAuth(ADMIN_COOKIE),
  async (req: AuthedRequest, res) => {
    if (!req.auth) return res.json(null);

    const u = (await User.findById(req.auth.sub).lean()) as IUserLean | null;
    if (!u || u.role !== 'admin') return res.json(null);

    res.json({
      _id: u._id,
      userId: u.userId,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: 'admin',
    });
  }
);

/** ------------------ MEMBER AUTH (member app) ------------------ **/

// POST /auth/member/login  { userId?, email?, password? | mobileLast4? }
router.post('/member/login', async (req, res) => {
  const { userId, email, password, mobileLast4 } = req.body || {};
  if (!userId && !email) {
    return res.status(400).json({ error: 'User ID or email required' });
  }

  const q: any = {};
  if (email) q.email = String(email).toLowerCase();
  if (userId) q.userId = String(userId);

  const user = (await User.findOne(q)
    .select('+passwordHash')
    .lean()) as IUserLean | null;

  if (!user || user.role !== 'member') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  let ok = false;

  if (password && user.passwordHash) {
    ok = await bcrypt.compare(String(password), String(user.passwordHash));
  } else if (mobileLast4) {
    const m = (user.mobile || '').replace(/\D/g, '');
    ok = m.endsWith(String(mobileLast4).trim());
  }

  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ sub: String(user._id), role: 'member' });
  setAuthCookie(res, token, MEMBER_COOKIE);

  res.json({
    ok: true,
    user: {
      _id: user._id,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'member',
    },
  });
});

router.post('/member/logout', (_req, res) => {
  clearAuthCookie(res, MEMBER_COOKIE);
  res.json({ ok: true });
});

router.get(
  '/member/me',
  readAuth(MEMBER_COOKIE),
  async (req: AuthedRequest, res) => {
    if (!req.auth) return res.json(null);

    const u = (await User.findById(req.auth.sub).lean()) as IUserLean | null;
    if (!u || u.role !== 'member') return res.json(null);

    res.json({
      _id: u._id,
      userId: u.userId,
      firstName: u.firstName,
      lastName: u.lastName,
      role: 'member',
    });
  }
);

export default router;
