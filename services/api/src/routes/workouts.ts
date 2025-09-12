import { Router } from 'express';
import WorkoutPlan from '../models/WorkoutPlan.js';

const router = Router();

function startOfWeek(d0?: Date) {
  const d = d0 ? new Date(d0) : new Date();
  const day = d.getDay(); // 0..6; we want Monday as start
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

// Get a user's plan for a week (defaults to current week)
router.get('/week', async (req, res) => {
  const { userId, weekStart } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const start = weekStart ? new Date(String(weekStart)) : startOfWeek();
  start.setHours(0, 0, 0, 0);
  const plan = await WorkoutPlan.findOne({ userId, weekStart: start });
  res.json({
    weekStart: start,
    days: plan?.days || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  });
});

// Upsert a weekly plan
router.post('/assign', async (req, res) => {
  const { userId, weekStart, days } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const start = weekStart ? new Date(weekStart) : startOfWeek();
  start.setHours(0, 0, 0, 0);
  const plan = await WorkoutPlan.findOneAndUpdate(
    { userId, weekStart: start },
    { userId, weekStart: start, days: days || {} },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json(plan);
});

export default router;
