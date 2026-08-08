import { Queue } from 'bullmq';
import { redis } from './redis';

export const SCHEDULED_JOBS_QUEUE = 'scheduled-jobs';

export const scheduledJobsQueue = new Queue(SCHEDULED_JOBS_QUEUE, {
  connection: redis,
});
