import { Router } from 'express';
import Payment from '../models/Payment';
import { recordPaymentSchema } from '../utils/validators';

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

export default router;
