import 'dotenv/config';
import { Queue } from 'bullmq';

const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : { host: '127.0.0.1', port: 6379 };

const q = new Queue('notifications', { connection });

(async () => {
  await q.add('test-sms', { to: '+15550000000', text: 'Hello from BullMQ!' });
  console.log('Enqueued test job');
  await q.close();
})();
