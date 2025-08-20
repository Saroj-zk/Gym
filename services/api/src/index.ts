// services/api/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { config } from './config';
import { connectDB } from './db';
import { errorHandler } from './middlewares/error';
import { scheduleExpiryReminder } from './jobs/expiryReminder';
import { seedAdmin } from './utils/seedAdmin';

import users from './routes/users';
import packs from './routes/packs';
import memberships from './routes/memberships';
import payments from './routes/payments';
import attendance from './routes/attendance';
import reports from './routes/reports';
import workoutsRouter from './routes/workouts';
import supplementsRouter from './routes/supplements';
import authRoutes from './routes/auth';
// add with the other imports
import settingsRoutes from './routes/settings';


async function bootstrap() {
  await connectDB();
  const app = express();

  // If behind a proxy in prod (NGINX/Heroku), keep this:
  // app.set('trust proxy', 1);

  app.use(helmet());

  // CORS must allow credentials for cookies to work from admin/member UIs
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://localhost:5174'], // admin-web, member-app
      credentials: true,
    })
  );

  // Must be BEFORE routes so /auth/me can read the cookie
  app.use(cookieParser());

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


  // Error handler
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
