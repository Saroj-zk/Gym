// services/api/src/routes/users.ts
import { Router } from 'express';
import { createUserSchema } from '../utils/validators.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Pack from '../models/Pack.js';
import { sendSMS } from '../utils/sms.js';

const router = Router();

/**
 * GET /users
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, status, role, limit } = req.query as {
      q?: string; status?: string; role?: string; limit?: string;
    };

    const filter: any = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (q) {
      const rx = new RegExp(String(q), 'i');
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { userId: rx },
        { email: rx },
        { mobile: rx },
      ];
    }

    const lim = Math.min(Math.max(Number(limit || 100), 1), 5000);
    const users = await User.find(filter).limit(lim).sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /users
 * Creates user; if packId provided, creates membership and sends activation SMS.
 */
router.post('/', async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);

    // Generate a readable userId
    const count = await User.countDocuments();
    const userId = body?.email
      ? body.email.split('@')[0]
      : `U${(count + 1).toString().padStart(5, '0')}`;

    const user = await User.create({ ...body, userId });

    // Optional: create membership if pack provided
    if (body.packId) {
      const pack = await Pack.findById(body.packId);
      if (pack) {
        const start = body.startDate ? new Date(body.startDate) : new Date();
        const end = new Date(start);
        if (pack.durationType === 'months') end.setMonth(end.getMonth() + (pack.durationValue || 1));
        if (pack.durationType === 'days') end.setDate(end.getDate() + (pack.durationValue || 30));
        // sessions-based: leave end date unchanged

        await Membership.create({
          userId: user._id,
          packId: pack._id,
          startDate: start,
          endDate: end,
          price: pack.price,
          paymentStatus: 'pending',
        });

        // Activation SMS
        if (user.mobile) {
          const gym = process.env.GYM_NAME || 'Your Gym';
          const startStr = start.toLocaleDateString();
          const endStr = end ? end.toLocaleDateString() : '';
          const bodyText =
            pack.durationType === 'sessions'
              ? `Welcome to ${gym}, ${user.firstName || ''}! Your ${pack.name} pack is active. Member ID: ${user.userId}.`
              : `Welcome to ${gym}, ${user.firstName || ''}! Your ${pack.name} pack is active from ${startStr} to ${endStr}. Member ID: ${user.userId}.`;
          await sendSMS(user.mobile, bodyText);
        }
      }
    }

    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /users/export/csv
 * (Keep this BEFORE '/:id' so it isn't shadowed.)
 */
router.get('/export/csv', async (req, res, next) => {
  try {
    const { q, status } = req.query as any;
    const filter: any = {};
    if (status && status !== 'all' && status !== '') filter.status = status;
    if (q) {
      const rx = new RegExp(q, 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { mobile: rx }, { userId: rx }];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).lean();
    const headers = ['User ID', 'First Name', 'Last Name', 'Email', 'Mobile', 'Status', 'Joined'];
    const lines = [headers.join(',')];
    for (const u of users) {
      const row = [
        u.userId ?? '', u.firstName ?? '', u.lastName ?? '',
        u.email ?? '', u.mobile ?? '', u.status ?? '',
        u.createdAt ? new Date(u.createdAt).toISOString() : ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      lines.push(row);
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(lines.join('\n'));
  } catch (e) {
    next(e);
  }
});

/**
 * GET /users/:id
 */
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

/**
 * PATCH /users/:id
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /users/:id
 */
router.delete('/:id', async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
