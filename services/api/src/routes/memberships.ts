import { Router } from 'express';
import Membership from '../models/Membership.js';
import Pack from '../models/Pack.js';
import User from '../models/User.js';
import { createMembershipSchema } from '../utils/validators.js';
import { sendSMS, getSMSTemplate } from '../utils/sms.js';

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

    // Send SMS Notification
    const user = await User.findById(body.userId);
    if (user && user.mobile) {
      console.log(`[Memberships] Triggering Welcome SMS for ${user.firstName} (${user.mobile})`)
      const msg = await getSMSTemplate('welcome', {
        USER_NAME: user.firstName || 'Member',
        PACK_NAME: pack.name || 'Membership',
        START_DATE: start.toLocaleDateString() || '',
        END_DATE: end ? end.toLocaleDateString() : '',
        USER_ID: user.userId || ''
      });
      sendSMS(user.mobile, msg).then(r => console.log('[Memberships] SMS Sent:', r)).catch(console.error);
    } else {
      console.log(`[Memberships] Skipping SMS: User not found or no mobile (userId=${body.userId})`)
    }

    res.status(201).json(membership);
  } catch (e) {
    next(e);
  }
});

export default router;
