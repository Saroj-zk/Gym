// services/api/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

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
  await connectDB();

  const app = express();

  // running on Render behind a proxy → needed for SameSite=None cookies
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      // prefer env-driven origins; fallback to your local ports
      origin: config.corsOrigin.length
        ? config.corsOrigin
        : ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
      methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
      allowedHeaders: ['Content-Type','Authorization'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  // quick startup log: which DB are we actually using?
  try {
    const u = new URL(config.mongoUri);
    // e.g. gymcluster0.gygt4mi.mongodb.net /gymstack
    console.log(`[DB] host=${u.host} db=${u.pathname.slice(1) || '(none)'} scheme=${u.protocol}`);
  } catch {}

  // health: proves DB connectivity + shows host/db
  app.get('/healthz', async (_req, res) => {
    try {
      // works with mongoose connection
      const ping = await mongoose.connection.db?.admin().command({ ping: 1 });
      const u = new URL(config.mongoUri);
      res.json({
        ok: ping?.ok === 1,
        host: u.host,
        db: u.pathname.slice(1) || '(none)',
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // existing lightweight health
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
