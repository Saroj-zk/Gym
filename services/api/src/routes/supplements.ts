import { Router } from 'express';
import { z } from 'zod';
import Supplement from '../models/Supplement.js';
import User from '../models/User.js';
import { sendSMS, getSMSTemplate } from '../utils/sms.js';

const router = Router();

/** ---------- Schemas ---------- */
const createSupplementSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  stockQty: z.number().int().nonnegative().optional(),
  unit: z.string().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateSupplementSchema = createSupplementSchema.partial();

const adjustStockSchema = z.object({
  delta: z.number().int().optional(),        // e.g., +5 or -2
  absolute: z.number().int().nonnegative().optional(), // set exact value
}).refine(v => v.delta !== undefined || v.absolute !== undefined, {
  message: 'Provide either delta or absolute'
});

/** ---------- List ---------- */
// GET /supplements?q=&category=&active=&lowStock=true&threshold=5&limit=200
router.get('/', async (req, res, next) => {
  try {
    const { q, category, active, lowStock, threshold, limit } = req.query as any;

    const filter: any = {};
    if (q) {
      const rx = new RegExp(String(q), 'i');
      filter.$or = [{ name: rx }, { sku: rx }, { category: rx }, { supplier: rx }];
    }
    if (category) filter.category = category;
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    if (lowStock === 'true') {
      const th = Math.max(0, Number(threshold ?? 5));
      filter.stockQty = { $lte: th };
    }

    const lim = Math.min(Math.max(Number(limit || 200), 1), 5000);
    const items = await Supplement.find(filter).sort({ createdAt: -1 }).limit(lim);
    res.json(items);
  } catch (e) { next(e); }
});

/** ---------- Create ---------- */
router.post('/', async (req, res, next) => {
  try {
    const body = createSupplementSchema.parse(req.body);
    const doc = await Supplement.create(body);

    // Send reminders to users who haven't logged in for a while
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const inactiveUsers = await User.find({
        role: 'member',
        status: 'active',
        $or: [
          { lastLogin: { $lt: sevenDaysAgo } },
          { lastLogin: { $exists: false } }
        ],
        mobile: { $exists: true, $ne: '' }
      }).limit(50); // limit to avoid spamming/exhausting credits in one go

      const msg = await getSMSTemplate('supplement', {
        PRODUCT_NAME: doc.name
      });

      for (const user of inactiveUsers) {
        if (user.mobile) {
          sendSMS(user.mobile, msg).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Supplement reminder error:', err);
    }

    res.status(201).json(doc);
  } catch (e) { next(e); }
});

/** ---------- Update ---------- */
router.put('/:id', async (req, res, next) => {
  try {
    const body = updateSupplementSchema.parse(req.body);
    const doc = await Supplement.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
});

/** ---------- Adjust stock (delta or absolute) ---------- */
router.patch('/:id/stock', async (req, res, next) => {
  try {
    const body = adjustStockSchema.parse(req.body);
    const doc = await Supplement.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    if (typeof body.absolute === 'number') {
      doc.stockQty = body.absolute;
    } else if (typeof body.delta === 'number') {
      doc.stockQty = Math.max(0, (doc.stockQty || 0) + body.delta);
    }
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
});

/** ---------- Activate / Deactivate or hard delete ---------- */
// DELETE /supplements/:id            -> soft delete (isActive=false)
// DELETE /supplements/:id?hard=true  -> hard delete
router.delete('/:id', async (req, res, next) => {
  try {
    const hard = String(req.query.hard || '').toLowerCase() === 'true';
    if (hard) {
      await Supplement.findByIdAndDelete(req.params.id);
      return res.json({ ok: true, hard: true });
    }
    const doc = await Supplement.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/** ---------- Export CSV ---------- */
// GET /supplements/export/csv (supports same filters as list)
router.get('/export/csv', async (req, res, next) => {
  try {
    // reuse the filtering from list
    const { q, category, active, lowStock, threshold } = req.query as any;
    const filter: any = {};
    if (q) {
      const rx = new RegExp(String(q), 'i');
      filter.$or = [{ name: rx }, { sku: rx }, { category: rx }, { supplier: rx }];
    }
    if (category) filter.category = category;
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    if (lowStock === 'true') {
      const th = Math.max(0, Number(threshold ?? 5));
      filter.stockQty = { $lte: th };
    }

    const items = await Supplement.find(filter).sort({ createdAt: -1 }).lean();

    const headers = [
      'Name', 'SKU', 'Category', 'Supplier', 'Purchase Price', 'Selling Price',
      'Stock Qty', 'Unit', 'Active', 'Image URL', 'Created'
    ];
    const lines = [headers.join(',')];

    for (const it of items) {
      const row = [
        it.name ?? '',
        it.sku ?? '',
        it.category ?? '',
        it.supplier ?? '',
        typeof it.purchasePrice === 'number' ? it.purchasePrice : '',
        typeof it.sellingPrice === 'number' ? it.sellingPrice : '',
        typeof it.stockQty === 'number' ? it.stockQty : '',
        it.unit ?? '',
        it.isActive ? 'true' : 'false',
        it.imageUrl ?? '',
        it.createdAt ? new Date(it.createdAt).toISOString() : ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      lines.push(row);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="supplements.csv"');
    res.send(lines.join('\n'));
  } catch (e) { next(e); }
});

export default router;
