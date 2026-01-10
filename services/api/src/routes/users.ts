// services/api/src/routes/users.ts
import { Router } from 'express';
import mongoose from 'mongoose';
import { createUserSchema } from '../utils/validators.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Pack from '../models/Pack.js';
import Attendance from '../models/Attendance.js';
import Appointment from '../models/Appointment.js';
import CalorieLog from '../models/CalorieLog.js';
import Payment from '../models/Payment.js';
import WorkoutPlan from '../models/WorkoutPlan.js';
import { sendSMS, getSMSTemplate } from '../utils/sms.js';
import { readAuth, requireRole, ADMIN_COOKIE } from '../utils/auth.js';

const router = Router();
router.use(readAuth(ADMIN_COOKIE));

/**
 * GET /users
 */

/**
 * GET /users/leaderboard
 * Top 10 users with most check-ins in the current month
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const agg = await Attendance.aggregate([
      { $match: { timestamp: { $gte: startOfMonth } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: 'userId', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          count: 1,
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          avatar: '$user.profileImageUrl',
          userId: '$user.userId'
        }
      }
    ]);

    res.json(agg);
  } catch (e) { next(e); }
});

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
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);

    // Generate a sequential numeric userId (1, 2, 3...)
    const latestUser = await User.findOne({ userId: { $regex: /^\d+$/ } })
      .sort({ userId: -1 })
      .collation({ locale: 'en_US', numericOrdering: true });

    let nextId = 1;
    if (latestUser && latestUser.userId && !isNaN(Number(latestUser.userId))) {
      nextId = Number(latestUser.userId) + 1;
    }
    const userId = nextId.toString();

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
          console.log(`[Users] Triggering Welcome SMS for ${user.firstName} (${user.mobile})`)
          const msg = await getSMSTemplate('welcome', {
            USER_NAME: user.firstName || 'Member',
            PACK_NAME: pack.name || 'Membership',
            START_DATE: start.toLocaleDateString() || '',
            END_DATE: end ? end.toLocaleDateString() : '',
            USER_ID: user.userId || ''
          });
          const res = await sendSMS(user.mobile, msg);
          console.log(`[Users] SMS Result for ${user.userId}:`, res);
        } else {
          console.log(`[Users] Skipping SMS: No mobile for ${user.userId}`)
        }
      }
    }

    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /users/import
 * Expects JSON { csvData: string }
 */
router.post('/import', requireRole('admin'), async (req, res, next) => {
  try {
    const { csvData } = req.body;
    if (!csvData) throw new Error('No CSV data provided');

    const lines = csvData.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    // Assume header row exists, skip it
    const start = lines[0].toLowerCase().includes('first') ? 1 : 0;

    const usersToCreate: any[] = [];

    // Find latest ID for sequential generation
    const latestUser = await User.findOne({ userId: { $regex: /^\d+$/ } })
      .sort({ userId: -1 })
      .collation({ locale: 'en_US', numericOrdering: true });

    let nextId = 1;
    if (latestUser && latestUser.userId && !isNaN(Number(latestUser.userId))) {
      nextId = Number(latestUser.userId) + 1;
    }

    for (let i = start; i < lines.length; i++) {
      // Simple splitting by comma ( caveat: will break if fields contain commas )
      const cols = lines[i].split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
      // Mapping: 0:First, 1:Last, 2:Email, 3:Mobile ... adjust as needed or try to be smart
      // Let's assume generic: First Name, Last Name, Email, Mobile
      if (cols.length < 2) continue;

      const [firstName, lastName, email, mobile, weight] = cols;

      usersToCreate.push({
        userId: (nextId++).toString(),
        firstName: firstName || 'Unknown',
        lastName: lastName || '',
        email: email,
        mobile: mobile,
        weight: weight ? Number(weight) : undefined,
        status: 'active',
        password: '123' // default password logic
      });
    }

    if (usersToCreate.length > 0) {
      await User.insertMany(usersToCreate);
    }

    res.json({ count: usersToCreate.length });
  } catch (e) { next(e); }
});

/**
 * GET /users/export/csv
 * (Keep this BEFORE '/:id' so it isn't shadowed.)
 */
router.get('/export/csv', requireRole('admin'), async (req, res, next) => {
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
  let user;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    user = await User.findById(req.params.id);
  }
  if (!user) {
    user = await User.findOne({ userId: req.params.id });
  }

  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

/**
 * PATCH /users/:id
 */
router.patch('/:id', requireRole('admin'), async (req, res, next) => {
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
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    console.log(`[Users] Attempting delete for param: ${req.params.id}`);
    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findById(req.params.id);
    }
    if (!user) {
      user = await User.findOne({ userId: req.params.id });
    }

    if (!user) {
      console.warn(`[Users] Delete failed: User not found for ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    const userObjectId = user._id;
    console.log(`[Users] Found user ${user.firstName} (${userObjectId}). Deleting...`);

    // 1. Delete user record
    await User.findByIdAndDelete(userObjectId);

    // 2. Cascade delete related data
    await Promise.all([
      Membership.deleteMany({ userId: userObjectId }),
      Attendance.deleteMany({ userId: userObjectId }),
      Appointment.deleteMany({ userId: userObjectId }),
      CalorieLog.deleteMany({ userId: userObjectId }),
      Payment.deleteMany({ userId: userObjectId }),
      WorkoutPlan.deleteMany({ userId: userObjectId }),
    ]);

    console.log(`[Users] Delete successful for ${userObjectId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('[Users] Delete error:', e);
    next(e);
  }
});

export default router;
