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
import dietRouter from './routes/diet.js';
import appointmentsRouter from './routes/appointments.js';

async function bootstrap() {
  await connectDB();

  const app = express();

  // Render/Proxies: required for SameSite=None cookies
  app.set('trust proxy', 1);

  /** -------------------- C O R S (must be first) -------------------- **/
  // Canonical domains and local dev
  const DEFAULT_ALLOWED = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://gym-member-app.vercel.app',
    'https://gym-admin-web-brown.vercel.app',

  ];

  // Optional wildcard acceptance for Vercel previews of these projects
  const VERCEL_WILDCARD_PREFIXES = ['gym-admin', 'gym-member-app']; // <--- your projects
  const VERCEL_SUFFIX = '.vercel.app';

  // Build allow-list from env (CORS_ORIGIN comma-separated) or defaults
  const raw =
    process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.length
      ? process.env.CORS_ORIGIN.split(',')
      : DEFAULT_ALLOWED;

  const ALLOWED_LIST = raw
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^['"]|['"]$/g, '')) // strip accidental quotes
    .map((s) => s.replace(/\/$/, '')); // remove trailing slash

  function hostOf(u: string) {
    const url = new URL(u.startsWith('http') ? u : `https://${u}`);
    return url.host;
  }

  function isAllowed(origin?: string | null): boolean {
    if (!origin) return true; // server-to-server / curl
    try {
      const { protocol, host } = new URL(origin);

      // 1) Exact match against explicit allow-list
      if (ALLOWED_LIST.some((a) => hostOf(a) === host || a === origin)) return true;

      // 2) Allow Vercel preview URLs for the two projects (https only)
      if (protocol === 'https:' && host.endsWith(VERCEL_SUFFIX)) {
        if (VERCEL_WILDCARD_PREFIXES.some((p) => host.startsWith(p))) return true;
      }

      return false;
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
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  // Startup log
  try {
    const u = new URL(config.mongoUri);
    console.log(`[DB] host=${u.host} db=${u.pathname.slice(1) || '(none)'} scheme=${u.protocol}`);
    console.log('[CORS] allowed:', ALLOWED_LIST.join(', '));
  } catch { }

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
  app.use('/diet', dietRouter);
  app.use('/appointments', appointmentsRouter);



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
