// services/api/src/config.ts
import 'dotenv/config.js';

const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gymstack',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  corsOrigin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
};

export default config;
