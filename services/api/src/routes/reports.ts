// services/api/src/routes/reports.ts
import { Router } from 'express';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import Pack from '../models/Pack.js';

const router = Router();

/**
 * GET /reports/revenue/summary?days=7
 * Returns series of daily revenue totals for the past N days.
 */
router.get('/revenue/summary', async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 7);
    const since = new Date();
    since.setDate(since.getDate() - days + 1); // include today

    const rows = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          // ignore refunded/cancelled if your schema uses it
          status: { $nin: ['refunded', 'cancelled'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          value: { $sum: { $toDouble: '$amount' } },
        },
      },
      { $project: { _id: 0, date: '$_id', value: 1 } },
      { $sort: { date: 1 } },
    ]);

    res.json({ series: rows });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /reports/attendance/peaks
 * Basic peak analysis by hour and weekday.
 */
router.get('/attendance/peaks', async (_req, res, next) => {
  try {
    const byHour = await Attendance.aggregate([
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, hour: '$_id', count: 1 } },
      { $sort: { hour: 1 } },
    ]);

    const byWeekday = await Attendance.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$timestamp' }, // 1=Sun ... 7=Sat
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, weekday: '$_id', count: 1 } },
      { $sort: { weekday: 1 } },
    ]);

    res.json({ byHour, byWeekday });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /reports/new-signups?days=7&limit=5
 */
router.get('/new-signups', async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 7);
    const limit = Math.min(Number(req.query.limit ?? 5), 100);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const users = await User.find({
      createdAt: { $gte: since },
      role: { $in: ['member', undefined] }, // treat missing role as member
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select({ userId: 1, firstName: 1, lastName: 1, createdAt: 1 })
      .lean();

    res.json({ items: users });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /reports/upcoming-renewals?days=7&limit=8
 */
router.get('/upcoming-renewals', async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 7);
    const limit = Math.min(Number(req.query.limit ?? 8), 100);

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const items = await Membership.aggregate([
      {
        $match: {
          endDate: { $gte: now, $lte: future },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'packs',
          localField: 'packId',
          foreignField: '_id',
          as: 'pack',
        },
      },
      { $unwind: { path: '$pack', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          startDate: 1,
          endDate: 1,
          user: {
            _id: '$user._id',
            userId: '$user.userId',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
          },
          packName: '$pack.name',
        },
      },
      { $sort: { endDate: 1 } },
      { $limit: limit },
    ]);

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /reports/leaderboard?days=30&limit=10
 * Points: member/manual=5, kiosk=10 (kiosk is +5 more than member).
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 30);
    const limit = Math.min(Number(req.query.limit ?? 10), 100);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await Attendance.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$userId',
          checkins: { $sum: 1 },
          kioskCount: {
            $sum: {
              $cond: [{ $eq: ['$method', 'kiosk'] }, 1, 0],
            },
          },
          memberCount: {
            $sum: {
              $cond: [{ $ne: ['$method', 'kiosk'] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          points: {
            $add: [
              { $multiply: ['$memberCount', 5] },
              { $multiply: ['$kioskCount', 10] }, // +5 more than member
            ],
          },
        },
      },
      { $sort: { points: -1, checkins: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          points: 1,
          checkins: 1,
          kioskCount: 1,
          user: {
            _id: '$user._id',
            userId: '$user.userId',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
          },
        },
      },
    ]);

    res.json({ items: rows, days, limit });
  } catch (e) {
    next(e);
  }
});

export default router;
