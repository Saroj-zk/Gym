// services/api/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import config from './config.js';
import { connectDB } from './db.js';
import { errorHandler } from './middlewares/error.js';
import { scheduleExpiryReminder } from './jobs/expiryReminder.js';
import { seedAdmin } from './utils/seedAdmin.js';

import users from './routes/users.js';
import packs from './routes/packs.js';
import memberships from './routes/memberships.js';
import payments from './routes/payments.js';
import attendance from './routes/attendance.js';
import reports from './routes/reports.js';
import workoutsRouter from './routes/workouts.js';
import supplementsRouter from './routes/supplements.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';

async function bootstrap() {
  await connectDB(); // <- match the import name
  const app = express();

  // app.set('trust proxy', 1); // keep if you run behind a proxy

  app.use(helmet());

  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://localhost:5174'], // or config.corsOrigin
      credentials: true,
    })
  );

  app.use(cookieParser());                 // cookies before routes
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Routes
  app.use('/auth', authRoutes);
  app.use('/users', users);
  app.use('/packs', packs);
  app.use('/memberships', memberships);
  app.use('/payments', payments);
  app.use('/attendance', attendance);
  app.use('/reports', reports);
  app.use('/workouts', workoutsRouter);
  app.use('/supplements', supplementsRouter);
  app.use('/settings', settingsRoutes);

  // Error handler (must be after routes)
  app.use(errorHandler);

  // Jobs & seeding
  scheduleExpiryReminder();
  await seedAdmin();

  app.listen(config.port, () => {
    console.log(`API listening on :${config.port}`);
  });
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
