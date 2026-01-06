import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import DietFood from '../models/DietFood.js';
import CalorieLog from '../models/CalorieLog.js';
import User from '../models/User.js';

const router = Router();

/** ---------- DIET FOODS ---------- */

const createFoodSchema = z.object({
    name: z.string().min(1),
    calories: z.number().multipleOf(0.1),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fats: z.number().optional(),
    servingSize: z.string().optional(),
    category: z.string().optional(),
    isVegetarian: z.boolean().optional(),
    isVegan: z.boolean().optional(),
    price: z.number().optional(),
    isPurchasable: z.boolean().optional(),
    imageUrl: z.string().url().optional(),
});

// GET /diet/foods
router.get('/foods', async (req, res, next) => {
    try {
        const { q, category } = req.query;
        const filter: any = {};
        if (q) filter.name = new RegExp(String(q), 'i');
        if (category) filter.category = category;

        // Default limit 100
        const items = await DietFood.find(filter).sort({ name: 1 }).limit(100);
        res.json(items);
    } catch (e) { next(e); }
});

// POST /diet/foods (Admin)
router.post('/foods', async (req, res, next) => {
    try {
        const body = createFoodSchema.parse(req.body);
        const doc = await DietFood.create(body);
        res.status(201).json(doc);
    } catch (e) { next(e); }
});


/** ---------- DAILY LOGS ---------- */

// GET /diet/logs?userId=...&date=YYYY-MM-DD
router.get('/logs', async (req, res, next) => {
    try {
        const { userId, date } = req.query as any;
        if (!userId || !date) return res.status(400).json({ error: 'userId and date required' });

        let log = await CalorieLog.findOne({ userId, date });
        // If no log exists, we might want to return an empty structure or null
        // Let's return null if not found, frontend handles it
        res.json(log || null);
    } catch (e) { next(e); }
});

// POST /diet/logs/item
// Add items to today's log. Upserts if needed.
const logItemSchema = z.object({
    userId: z.string(),
    date: z.string(), // YYYY-MM-DD
    items: z.array(z.object({
        foodName: z.string(),
        calories: z.number(),
        protein: z.number().default(0),
        carbs: z.number().default(0),
        fats: z.number().default(0),
        qty: z.number().default(1),
    })),
});

router.post('/logs/item', async (req, res, next) => {
    try {
        const { userId, date, items } = logItemSchema.parse(req.body);

        // Calc totals added
        const caloriesAdded = items.reduce((acc, i) => acc + (i.calories * i.qty), 0);

        let log = await CalorieLog.findOne({ userId, date });
        if (!log) {
            // Create new
            // Try to get current weight from User to snapshot it
            let user;
            if (mongoose.Types.ObjectId.isValid(userId)) {
                user = await User.findById(userId);
            }
            if (!user) {
                user = await User.findOne({ userId });
            }
            const weight = user?.weight || 0;

            log = await CalorieLog.create({
                userId,
                date,
                items,
                totalCalories: caloriesAdded,
                weightLogged: weight
            });
        } else {
            // Update existing
            log.items.push(...items);
            log.totalCalories = (log.totalCalories || 0) + caloriesAdded;
            await log.save();
        }

        res.json(log);
    } catch (e) { next(e); }
});

/** ---------- USER METRICS ---------- */

// POST /diet/weight
// Updates user weight in User profile AND update today's log snapshot
const updateWeightSchema = z.object({
    userId: z.string(),
    weight: z.number().positive(),
    height: z.number().positive().optional(),
    activityLevel: z.string().optional()
});

router.post('/weight', async (req, res, next) => {
    try {
        const { userId, weight, height, activityLevel } = updateWeightSchema.parse(req.body);

        const update: any = { weight };
        if (height) update.height = height;
        if (activityLevel) update.activityLevel = activityLevel;

        let user;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findByIdAndUpdate(userId, update, { new: true });
        }
        if (!user) {
            user = await User.findOneAndUpdate({ userId }, update, { new: true });
        }

        // Also update today's log if exists, to keep history of weight
        const today = new Date().toISOString().split('T')[0];
        await CalorieLog.findOneAndUpdate(
            { userId, date: today },
            { $set: { weightLogged: weight } }
        );

        res.json(user);
    } catch (e) { next(e); }
});

export default router;
