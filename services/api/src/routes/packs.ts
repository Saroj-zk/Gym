import { Router } from 'express';
import Pack from '../models/Pack';
import { createPackSchema } from '../utils/validators';

const router = Router();

router.get('/', async (_req, res) => {
  const packs = await Pack.find({}).sort({ sortOrder: 1, createdAt: -1 });
  res.json(packs);
});

router.post('/', async (req, res, next) => {
  try {
    const body = createPackSchema.parse(req.body);
    const pack = await Pack.create(body);
    res.status(201).json(pack);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const pack = await Pack.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(pack);
  } catch (e) {
    next(e);
  }
});

export default router;
