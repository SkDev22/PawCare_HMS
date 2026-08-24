import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../lib/logger';
import { runInvoiceOverdueAlert } from './invoice-overdue.job';
import { runDailyDigest } from './daily-digest.job';
import { runNotificationRetention } from './notification-retention.job';
import { runTrialExpiryReminder } from './trial-expiry.job';

// Daily, fixed UTC time — no per-clinic timezone awareness yet.
const DAILY_CRON = '0 7 * * *';
const CRON_OPTIONS = { timezone: 'UTC' } as const;

const JOBS: Record<string, () => Promise<void>> = {
  'invoice-overdue-alert':  runInvoiceOverdueAlert,
  'daily-digest':           runDailyDigest,
  'notification-retention': runNotificationRetention,
  'trial-expiry-reminder':  runTrialExpiryReminder,
};

let tasks: ScheduledTask[] = [];

function runJob(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      logger.error('Scheduled job failed', { name, err });
    }
  };
}

// Runs the three daily jobs directly inside this process — no queue, no
// worker, no Redis. Idempotent: calling this again (e.g. a dev-server
// respawn) first stops any previously scheduled tasks so jobs never double-fire.
export function initScheduledJobs(): void {
  stopScheduledJobs();

  tasks = Object.entries(JOBS).map(([name, fn]) =>
    cron.schedule(DAILY_CRON, runJob(name, fn), CRON_OPTIONS),
  );

  logger.info('Scheduled jobs initialized', { jobs: Object.keys(JOBS) });
}

export function stopScheduledJobs(): void {
  for (const task of tasks) task.stop();
  tasks = [];
}
