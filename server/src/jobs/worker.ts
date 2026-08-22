import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { SCHEDULED_JOBS_QUEUE, scheduledJobsQueue } from '../lib/queue';
import { runInvoiceOverdueAlert } from './invoice-overdue.job';
import { runDailyDigest } from './daily-digest.job';
import { runNotificationRetention } from './notification-retention.job';

const JOB_NAMES = {
  INVOICE_OVERDUE_ALERT: 'invoice-overdue-alert',
  DAILY_DIGEST:          'daily-digest',
  NOTIFICATION_RETENTION: 'notification-retention',
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
        case JOB_NAMES.NOTIFICATION_RETENTION:
          return runNotificationRetention();
        default:
          logger.warn('Unknown scheduled job received', { name: job.name });
      }
    },
    // Only 3 daily jobs run through this worker, so there's no need to poll
    // for stalled jobs every 30s (the BullMQ default) — that's pure Redis
    // command overhead on a low-volume queue.
    { connection: redis, stalledInterval: 5 * 60 * 1000 },
  );

  worker.on('failed', (job, err) => {
    logger.error('Scheduled job failed', { name: job?.name, err });
  });

  // BullMQ's internal maintenance tasks (e.g. the periodic stalled-job check)
  // emit 'error' on transient Redis failures. Without a listener here,
  // Node treats it as an unhandled EventEmitter error and crashes the process.
  worker.on('error', (err) => {
    logger.error('Scheduled job worker error', { err });
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
  await scheduledJobsQueue.add(
    JOB_NAMES.NOTIFICATION_RETENTION,
    {},
    { repeat: { pattern: DAILY_CRON }, jobId: JOB_NAMES.NOTIFICATION_RETENTION },
  );
  logger.info('Repeatable scheduled jobs registered');
}

export async function closeWorker(): Promise<void> {
  await worker?.close();
}
