import 'dotenv/config';
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { createClient } from 'redis';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

new QueueScheduler('notifications', { connection });

const notifications = new Queue('notifications', { connection });

new Worker('notifications', async (job) => {
  // Placeholder: send SMS/Email based on job.data
  console.log('Sending notification', job.data);
}, { connection });

console.log('Worker ready');
