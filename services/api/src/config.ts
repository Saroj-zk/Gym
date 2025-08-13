import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/gymstack',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  corsOrigin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};
