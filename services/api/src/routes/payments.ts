import { Router } from 'express';
import Payment from '../models/Payment';
import { recordPaymentSchema } from '../utils/validators';
import User from '../models/User';

const router = Router();

router.get('/', async (req, res) => {
  const { userId, method, status, from, to } = req.query;
  const filter: any = {};
  if (userId) filter.userId = userId;
  if (method) filter.method = method;
  if (status) filter.status = status;
  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = new Date(String(from));
    if (to) {
      const end = new Date(String(to));
      end.setHours(23,59,59,999);
      filter.paidAt.$lte = end;
    }
  }
  const list = await Payment.find(filter)
    .populate('userId', 'userId firstName lastName email mobile')
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(500);
  res.json(list);
});

router.post('/record', async (req, res, next) => {
  try {
    const body = recordPaymentSchema.parse(req.body);
    const payment = await Payment.create({
      ...body,
      status: 'succeeded',
      paidAt: new Date()
    });
    res.status(201).json(payment);
  } catch (e) {
    next(e);
  }
});

/**
 * Admin Sales (supplement purchases)
 * GET /payments/sales?q=&method=&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100
 * - Filters description containing "Supplement purchase"
 * - Populates user (firstName, lastName, userId)
 */
router.get('/sales', async (req, res, next) => {
  try {
    const { q, method, from, to, limit } = req.query as any;

    const filter: any = {
      description: { $regex: /Supplement purchase/i },
    };
    if (q) {
      const rx = new RegExp(String(q), 'i');
      // match in description or member name/email/mobile/userId
      filter.$or = [
        { description: rx },
        { 'user.firstName': rx }, // when we project later
        { 'user.lastName': rx },
      ];
    }
    if (method) filter.method = method;

    // Date filter (createdAt)
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) {
        const end = new Date(`${to}T00:00:00.000Z`);
        end.setDate(end.getDate() + 1); // inclusive to end-of-day
        filter.createdAt.$lt = end;
      }
    }

    const lim = Math.min(Math.max(Number(limit || 200), 1), 5000);

    const items = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(lim)
      .populate('userId', 'firstName lastName userId');

    res.json(items);
  } catch (e) {
    next(e);
  }
});

/**
 * CSV export for sales (same filters as above)
 * GET /payments/sales/export/csv
 */
router.get('/sales/export/csv', async (req, res, next) => {
  try {
    const { q, method, from, to } = req.query as any;

    const filter: any = { description: { $regex: /Supplement purchase/i } };
    if (q) {
      const rx = new RegExp(String(q), 'i');
      filter.$or = [{ description: rx }];
    }
    if (method) filter.method = method;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) {
        const end = new Date(`${to}T00:00:00.000Z`);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }

    const items = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName userId')
      .lean();

    const headers = ['Date', 'Member', 'User ID', 'Amount', 'Method', 'Description'];
    const lines = [headers.join(',')];

    for (const p of items) {
      const u: any = p.userId || {};
      const row = [
        p.createdAt ? new Date(p.createdAt).toISOString() : '',
        [u.firstName, u.lastName].filter(Boolean).join(' '),
        u.userId || '',
        typeof p.amount === 'number' ? p.amount : '',
        p.method || '',
        p.description || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      lines.push(row);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="supplement_sales.csv"');
    res.send(lines.join('\n'));
  } catch (e) {
    next(e);
  }
});

/** (Optional) Update payment status: refunded/cancelled/paid */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body as { status?: string };
    if (!status) return res.status(400).json({ error: 'status required' });
    const p = await Payment.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) {
    next(e);
  }
});

export default router;
