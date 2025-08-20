import { Router } from 'express';
import Setting from '../models/Setting';
import { requireRole } from '../utils/auth';

const router = Router();

// Read leaderboard settings (returns {} if nothing set yet)
router.get('/leaderboard', requireRole('admin'), async (_req, res) => {
  const s = await Setting.findOne({ key: 'leaderboard' }).lean();
  res.json(s?.value || {});
});

// Start a new season now
router.put('/leaderboard/reset', requireRole('admin'), async (_req, res) => {
  const seasonStart = new Date();
  await Setting.updateOne(
    { key: 'leaderboard' },
    { $set: { value: { seasonStart } } },
    { upsert: true }
  );
  res.json({ ok: true, seasonStart });
});

export default router;
