import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import { markAttendanceSchema } from '../utils/validators.js';

const router = Router();

/**
 * GET /attendance
 * List attendance with optional filters.
 */
router.get('/', async (req, res) => {
  const { userId, from, to, limit } = req.query;
  const filter: any = {};
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(String(from));
    if (to) {
      const end = new Date(String(to));
      end.setHours(23, 59, 59, 999);
      filter.timestamp.$lte = end;
    }
  }
  const lim = Math.min(Math.max(Number(limit || 200), 10), 1000);
  const list = await Attendance.find(filter)
    .populate('userId', 'userId firstName lastName email mobile')
    .sort({ timestamp: -1 })
    .limit(lim);
  res.json(list);
});

/**
 * POST /attendance/mark
 * Mark attendance by Mongo user _id (used internally).
 */
router.post('/mark', async (req, res, next) => {
  try {
    const body = markAttendanceSchema.parse(req.body);

    const allowed = new Set(['manual', 'qr', 'kiosk', 'face']);
    const incoming = String(body.method || '').toLowerCase();
    const methodNormalized = (allowed.has(incoming) ? incoming : 'manual') as
      | 'manual' | 'qr' | 'kiosk' | 'face';

    const rec = await Attendance.create({
      userId: body.userId,
      method: methodNormalized,
      deviceId: body.deviceId,
      timestamp: new Date(),
    });

    res.status(201).json({ ok: true, attendance: rec });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /attendance/mark-by-code
 * Mark attendance by human-friendly user code (User.userId).
 * - Kiosk (method: 'kiosk'): NO mobile required
 * - Member/Public (other methods): mobile last-4 required
 */
router.post('/mark-by-code', async (req, res, next) => {
  try {
    const { userCode, mobile, method, deviceId } = req.body as {
      userCode?: string; mobile?: string; method?: string; deviceId?: string;
    };

    if (!userCode) return res.status(400).json({ error: 'userCode is required' });

    // Normalize method and detect kiosk
    const allowed = new Set(['manual', 'qr', 'kiosk', 'face']);
    const incoming = String(method || '').toLowerCase();
    const methodNormalized = (allowed.has(incoming) ? incoming : 'manual') as
      | 'manual' | 'qr' | 'kiosk' | 'face';
    const isKiosk = methodNormalized === 'kiosk';

    // Find user by their readable code
    const user = await User.findOne({ userId: userCode });
    if (!user) return res.status(404).json({ error: 'User not found for that code' });

    // For non-kiosk flows, require mobile last-4 check
    if (!isKiosk) {
      const digits = (s: string) => String(s || '').replace(/\D/g, '');
      const provided = digits(mobile || '');
      if (!mobile) return res.status(400).json({ error: 'mobile is required' });
      if (provided.length < 4) return res.status(400).json({ error: 'Enter at least last 4 digits of your mobile' });
      if (!user.mobile) return res.status(400).json({ error: 'No mobile number on file for this user' });
      const stored = digits(user.mobile);
      if (!stored.endsWith(provided)) return res.status(401).json({ error: 'Mobile verification failed' });
    }

    // Create attendance
    const rec = await Attendance.create({
      userId: user._id,
      method: methodNormalized,
      deviceId,
      timestamp: new Date(),
    });

    // Build membership summary for the client UI
    const membership = await Membership.findOne({ userId: user._id })
      .populate('packId', 'name durationType durationValue')
      .sort({ endDate: -1, createdAt: -1 });

    let membershipSummary: any = null;
    if (membership) {
      const now = new Date();
      const end = membership.endDate ? new Date(membership.endDate) : null;
      const remainingDays = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;
      membershipSummary = {
        packName: (membership.packId as any)?.name ?? null,
        startDate: membership.startDate,
        endDate: membership.endDate,
        remainingDays,
        status: membership.status,
        paymentStatus: membership.paymentStatus,
        durationType: (membership.packId as any)?.durationType ?? null,
        durationValue: (membership.packId as any)?.durationValue ?? null,
      };
    }

    res.status(201).json({
      ok: true,
      attendance: rec,
      user: {
        id: String(user._id),
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      membership: membershipSummary,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
