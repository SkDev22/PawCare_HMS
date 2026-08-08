import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { SCHEDULED_JOBS_QUEUE, scheduledJobsQueue } from '../lib/queue';
import { runInvoiceOverdueAlert } from './invoice-overdue.job';
import { runDailyDigest } from './daily-digest.job';

const JOB_NAMES = {
  INVOICE_OVERDUE_ALERT: 'invoice-overdue-alert',
  DAILY_DIGEST:          'daily-digest',
} as const;

// Daily, fixed UTC time — no per-clinic timezone awareness yet.
const DAILY_CRON = '0 7 * * *';

let worker: Worker | undefined;

export function initWorker(): Worker {
  worker = new Worker(
    SCHEDULED_JOBS_QUEUE,
    async (job: Job) => {
      switch (job.name) {
        case JOB_NAMES.INVOICE_OVERDUE_ALERT:
          return runInvoiceOverdueAlert();
        case JOB_NAMES.DAILY_DIGEST:
          return runDailyDigest();
        default:
          logger.warn('Unknown scheduled job received', { name: job.name });
      }
    },
    { connection: redis },
  );

  worker.on('failed', (job, err) => {
    logger.error('Scheduled job failed', { name: job?.name, err });
  });

  logger.info('Scheduled job worker initialized');
  return worker;
}

// Idempotent — BullMQ upserts repeatable jobs by jobId, so calling this on
// every boot (including dev-server respawns) does not create duplicates.
export async function registerRepeatableJobs(): Promise<void> {
  await scheduledJobsQueue.add(
    JOB_NAMES.INVOICE_OVERDUE_ALERT,
    {},
    { repeat: { pattern: DAILY_CRON }, jobId: JOB_NAMES.INVOICE_OVERDUE_ALERT },
  );
  await scheduledJobsQueue.add(
    JOB_NAMES.DAILY_DIGEST,
    {},
    { repeat: { pattern: DAILY_CRON }, jobId: JOB_NAMES.DAILY_DIGEST },
  );
  logger.info('Repeatable scheduled jobs registered');
}

export async function closeWorker(): Promise<void> {
  await worker?.close();
}
