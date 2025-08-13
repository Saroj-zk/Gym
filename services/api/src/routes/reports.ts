import { Router } from 'express';
import Membership from '../models/Membership';
import Payment from '../models/Payment';
import Attendance from '../models/Attendance';

const router = Router();

router.get('/revenue/summary', async (req, res) => {
  const days = Number(req.query.days || 30);
  const since = new Date(Date.now() - days*24*60*60*1000);
  const data = await Payment.aggregate([
    { $match: { paidAt: { $gte: since }, status: 'succeeded' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, value: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ rangeDays: days, series: data.map(d => ({ date: d._id, value: d.value }))});
});

router.get('/attendance/peaks', async (_req, res) => {
  const data = await Attendance.aggregate([
    { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ byHour: data.map(d => ({ hour: d._id, count: d.count }))});
});

export default router;
