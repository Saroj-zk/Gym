import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

const router = Router();

// GET /appointments?date=...&type=...
router.get('/', async (req, res, next) => {
    try {
        const { date, type, userId } = req.query as any;
        const filter: any = {};
        if (date) filter.date = date;
        if (type) filter.type = type;
        if (userId) filter.userId = userId;

        const items = await Appointment.find(filter).sort({ date: -1, timeSlot: 1 });
        res.json(items);
    } catch (e) { next(e); }
});

// POST /appointments (Book)
const bookSchema = z.object({
    type: z.enum(['physio', 'pt', 'gynecologist', 'consultation']),
    userId: z.string().optional(), // optional if admin books for walk-in or just placeholder
    providerName: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeSlot: z.string(),
    notes: z.string().optional(),
});

router.post('/', async (req, res, next) => {
    try {
        const body = bookSchema.parse(req.body);

        // If userId provided, fetch user to get name
        let memberName = '';
        if (body.userId) {
            let u;
            if (mongoose.Types.ObjectId.isValid(body.userId)) {
                u = await User.findById(body.userId);
            }
            if (!u) {
                u = await User.findOne({ userId: body.userId });
            }
            if (u) memberName = `${u.firstName} ${u.lastName}`.trim();
        }

        const doc = await Appointment.create({ ...body, memberName });
        res.status(201).json(doc);
    } catch (e) { next(e); }
});

// PATCH /appointments/:id (Update status)
router.patch('/:id', async (req, res, next) => {
    try {
        const { status, notes } = req.body;
        const update: any = {};
        if (status) update.status = status;
        if (notes) update.notes = notes;

        const doc = await Appointment.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(doc);
    } catch (e) { next(e); }
});

export default router;
