import { Router } from 'express';
import Membership from '../models/Membership.js';
import Pack from '../models/Pack.js';
import { createMembershipSchema } from '../utils/validators.js';

const router = Router();

router.get('/', async (req, res) => {
  const { userId } = req.query;
  const filter: any = {};
  if (userId) filter.userId = userId;
  const list = await Membership.find(filter).populate('packId').sort({ createdAt: -1 });
  res.json(list);
});

router.post('/', async (req, res, next) => {
  try {
    const body = createMembershipSchema.parse(req.body);
    const pack = await Pack.findById(body.packId);
    if (!pack) return res.status(400).json({ error: 'Invalid packId' });
    const start = body.startDate ? new Date(body.startDate) : new Date();
    const end = new Date(start);
    if (pack.durationType === 'months') end.setMonth(end.getMonth() + (pack.durationValue || 1));
    if (pack.durationType === 'days') end.setDate(end.getDate() + (pack.durationValue || 30));

    const membership = await Membership.create({
      userId: body.userId,
      packId: body.packId,
      startDate: start,
      endDate: end,
      price: body.price ?? pack.price,
      discount: body.discount ?? 0,
      paymentStatus: 'pending'
    });
    res.status(201).json(membership);
  } catch (e) {
    next(e);
  }
});

export default router;
