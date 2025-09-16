// services/api/src/config.ts
import 'dotenv/config.js';

const mongoUri =
  process.env.MONGODB_URI ??
  process.env.MONGO_URI ??
  'mongodb://127.0.0.1:27017/gymstack'; // local fallback for dev only

const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri,
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  corsOrigin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
};

export default config;
