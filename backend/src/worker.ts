import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Create queues for different job types
const emailQueue = new Queue('email', { connection: redis });
const reportQueue = new Queue('report', { connection: redis });
const backupQueue = new Queue('backup', { connection: redis });

console.log('🚀 Seth Clinic CMS Worker started');

// Process email jobs
emailQueue.process(async (job) => {
  console.log('Processing email job:', job.id);
  // Add email processing logic here
  return { status: 'completed' };
});

// Process report jobs
reportQueue.process(async (job) => {
  console.log('Processing report job:', job.id);
  // Add report generation logic here
  return { status: 'completed' };
});

// Process backup jobs
backupQueue.process(async (job) => {
  console.log('Processing backup job:', job.id);
  // Add backup logic here
  return { status: 'completed' };
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await emailQueue.close();
  await reportQueue.close();
  await backupQueue.close();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await emailQueue.close();
  await reportQueue.close();
  await backupQueue.close();
  await redis.quit();
  process.exit(0);
});
