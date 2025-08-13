import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { connectDB } from './db';
import { errorHandler } from './middlewares/error';
import { scheduleExpiryReminder } from './jobs/expiryReminder'

import users from './routes/users';
import packs from './routes/packs';
import memberships from './routes/memberships';
import payments from './routes/payments';
import attendance from './routes/attendance';
import reports from './routes/reports';
import workoutsRouter from './routes/workouts';

async function bootstrap() {
  await connectDB();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/users', users);
  app.use('/packs', packs);
  app.use('/memberships', memberships);
  app.use('/payments', payments);
  app.use('/attendance', attendance);
  app.use('/reports', reports);
  app.use('/workouts', workoutsRouter);

  app.use(errorHandler);

  scheduleExpiryReminder()

  app.listen(config.port, () => {
    console.log(`API listening on :${config.port}`);
  });
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
