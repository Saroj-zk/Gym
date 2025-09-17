// services/api/src/index.ts
import express from 'express';
import cors, { type CorsOptions } from 'cors';
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

  // Render/Proxies: required for SameSite=None cookies
  app.set('trust proxy', 1);

  /** -------------------- C O R S  (must be first) -------------------- **/
  const DEFAULT_ALLOWED = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://gym-member-app.vercel.app',
    'https://gym-admin-web-brown.vercel.app',
  ];

  // Build allow-list from env (CORS_ORIGIN comma-separated) or defaults
  const raw = (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.length
    ? process.env.CORS_ORIGIN.split(',')
    : DEFAULT_ALLOWED
  );

  const ALLOWED_LIST = raw
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^['"]|['"]$/g, '')) // strip accidental quotes
    .map(s => s.replace(/\/$/, ''));         // remove trailing slash

  // Match by host for robustness
  function isAllowed(origin?: string | null): boolean {
    if (!origin) return true; // allow server-to-server / curl (no Origin header)
    try {
      const oHost = new URL(origin).host;
      return ALLOWED_LIST.some(a => {
        const aUrl = a.startsWith('http') ? a : `https://${a}`;
        const aHost = new URL(aUrl).host;
        return aHost === oHost || a === origin;
      });
    } catch {
      return false;
    }
  }

  const corsOpts: CorsOptions = {
    origin: (origin, cb) => {
      const ok = isAllowed(origin);
      if (!ok) console.warn('[CORS] blocked origin:', origin, 'allowed=', ALLOWED_LIST);
      cb(null, ok);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOpts));
  app.options('*', cors(corsOpts)); // ensure preflight works everywhere

  /** -------------------- Security / parsers -------------------- **/
  app.use(helmet({
    // allow cross-origin XHR/resources
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  // Startup log
  try {
    const u = new URL(config.mongoUri);
    console.log(`[DB] host=${u.host} db=${u.pathname.slice(1) || '(none)'} scheme=${u.protocol}`);
    console.log('[CORS] allowed:', ALLOWED_LIST.join(', '));
  } catch {}

  /** -------------------- Health -------------------- **/
  app.get('/healthz', async (_req, res) => {
    try {
      const ping = await mongoose.connection.db?.admin().command({ ping: 1 });
      const u = new URL(config.mongoUri);
      res.json({ ok: ping?.ok === 1, host: u.host, db: u.pathname.slice(1) || '(none)' });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  /** -------------------- Routes -------------------- **/
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
