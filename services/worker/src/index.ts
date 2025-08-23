import 'dotenv/config';
import { Queue, Worker } from 'bullmq';

const connection =
  process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }          // works for redis:// and rediss://
    : { host: '127.0.0.1', port: 6379 };

const queueName = 'notifications';

// Create the queue
export const notifications = new Queue(queueName, { connection });

// Create the worker (no QueueScheduler needed in BullMQ v4+)
const worker = new Worker(
  queueName,
  async (job) => {
    // TODO: send SMS/Email/etc
    console.log('Sending notification:', job.name, job.data);
  },
  { connection }
);

worker.on('ready', () => console.log('Worker ready'));
worker.on('failed', (job, err) =>
  console.error('Job failed', job?.id, err?.message)
);
worker.on('error', (err) => console.error('Worker error', err));

// Graceful shutdown
async function shutdown() {
  try {
    await worker.close();
    await notifications.close();
  } finally {
    process.exit(0);
  }
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));
