// services/api/src/routes/reports.ts
import { Router } from 'express';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import Pack from '../models/Pack.js';

const router = Router();

/**
 * GET /reports/stats
 * Comprehensive stats for the dashboard
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Revenue Today
    const revToday = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
          status: { $nin: ['refunded', 'cancelled'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
    ]);

    // 2. Revenue This Month
    const revMonth = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          status: { $nin: ['refunded', 'cancelled'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
    ]);

    // 3. Active Members (users with an active membership)
    const activeMembersCount = await Membership.distinct('userId', {
      endDate: { $gte: now },
      status: { $ne: 'inactive' }
    });

    // 4. Total Users
    const totalUsers = await User.countDocuments({ role: { $in: ['member', undefined] } });

    // 5. Revenue series for graph (past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const revSeries = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $nin: ['refunded', 'cancelled'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: { $toDouble: '$amount' } },
        },
      },
      { $project: { _id: 0, date: '$_id', amount: 1 } },
      { $sort: { date: 1 } },
    ]);

    // 6. Membership Distribution
    const dist = await Membership.aggregate([
      { $match: { endDate: { $gte: now } } },
      {
        $lookup: {
          from: 'packs',
          localField: 'packId',
          foreignField: '_id',
          as: 'pack',
        },
      },
      { $unwind: '$pack' },
      {
        $group: {
          _id: '$pack.name',
          count: { $sum: 1 },
        },
      },
      { $project: { name: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      revenueToday: revToday[0]?.total || 0,
      revenueThisMonth: revMonth[0]?.total || 0,
      activeMembers: activeMembersCount.length,
      totalMembers: totalUsers,
      revenueSeries: revSeries,
      membershipDistribution: dist
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /reports/revenue/summary?days=7
 */
router.get('/revenue/summary', async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 7);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);

    const rows = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
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
          _id: { $dayOfWeek: '$timestamp' },
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
      role: { $in: ['member', undefined] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select({ userId: 1, firstName: 1, lastName: 1, createdAt: 1 })
      .lean();

    res.json({ users }); // Note: updated to match Dashboard.tsx expectation if needed, or keep it consistent
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
          pack: { name: '$pack.name' },
        },
      },
      { $sort: { endDate: 1 } },
      { $limit: limit },
    ]);

    res.json({ items, days, count: items.length });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /reports/leaderboard?days=30&limit=10
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
            $sum: { $cond: [{ $eq: ['$method', 'kiosk'] }, 1, 0] },
          },
          memberCount: {
            $sum: { $cond: [{ $ne: ['$method', 'kiosk'] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          points: {
            $add: [
              { $multiply: ['$memberCount', 5] },
              { $multiply: ['$kioskCount', 10] },
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
