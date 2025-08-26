"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
});
const emailQueue = new bullmq_1.Queue('email', { connection: redis });
const reportQueue = new bullmq_1.Queue('report', { connection: redis });
const backupQueue = new bullmq_1.Queue('backup', { connection: redis });
console.log('🚀 Seth Clinic CMS Worker started');
const emailWorker = new bullmq_1.Worker('email', async (job) => {
    console.log('Processing email job:', job.id);
    return { status: 'completed' };
}, { connection: redis });
const reportWorker = new bullmq_1.Worker('report', async (job) => {
    console.log('Processing report job:', job.id);
    return { status: 'completed' };
}, { connection: redis });
const backupWorker = new bullmq_1.Worker('backup', async (job) => {
    console.log('Processing backup job:', job.id);
    return { status: 'completed' };
}, { connection: redis });
process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await emailWorker.close();
    await reportWorker.close();
    await backupWorker.close();
    await emailQueue.close();
    await reportQueue.close();
    await backupQueue.close();
    await redis.quit();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await emailWorker.close();
    await reportWorker.close();
    await backupWorker.close();
    await emailQueue.close();
    await reportQueue.close();
    await backupQueue.close();
    await redis.quit();
    process.exit(0);
});
//# sourceMappingURL=worker.js.map