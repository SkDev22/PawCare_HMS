import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../lib/logger';
import { runInvoiceOverdueAlert } from './invoice-overdue.job';
import { runDailyDigest } from './daily-digest.job';
import { runNotificationRetention } from './notification-retention.job';
import { runTrialExpiryReminder } from './trial-expiry.job';
import { runAppointmentReminders } from './appointment-reminder.job';
import { runVaccineDueReminders } from './vaccine-due-reminder.job';

// Fixed UTC schedules — no per-clinic timezone awareness at the cron level;
// each job checks its own clinics' quiet hours internally (see quiet-hours.ts).
const DAILY_CRON = '0 7 * * *';
// Appointment reminders need finer granularity than once a day — a "2 hours
// before" reminder is meaningless on a daily cron — so it gets its own
// hourly schedule instead of sharing DAILY_CRON.
const HOURLY_CRON = '0 * * * *';
const CRON_OPTIONS = { timezone: 'UTC' } as const;

const JOBS: Record<string, { cron: string; fn: () => Promise<void> }> = {
  'invoice-overdue-alert':  { cron: DAILY_CRON, fn: runInvoiceOverdueAlert },
  'daily-digest':           { cron: DAILY_CRON, fn: runDailyDigest },
  'notification-retention': { cron: DAILY_CRON, fn: runNotificationRetention },
  'trial-expiry-reminder':  { cron: DAILY_CRON, fn: runTrialExpiryReminder },
  'vaccine-due-reminder':   { cron: DAILY_CRON, fn: runVaccineDueReminders },
  'appointment-reminder':   { cron: HOURLY_CRON, fn: runAppointmentReminders },
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

// Runs every job directly inside this process — no queue, no worker, no
// Redis. Idempotent: calling this again (e.g. a dev-server respawn) first
// stops any previously scheduled tasks so jobs never double-fire.
export function initScheduledJobs(): void {
  stopScheduledJobs();

  tasks = Object.entries(JOBS).map(([name, { cron: expr, fn }]) =>
    cron.schedule(expr, runJob(name, fn), CRON_OPTIONS),
  );

  logger.info('Scheduled jobs initialized', { jobs: Object.keys(JOBS) });
}

export function stopScheduledJobs(): void {
  for (const task of tasks) task.stop();
  tasks = [];
}
