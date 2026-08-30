// Manual-payment reminder window — shared by the in-app banner and the
// email/notification cron job so both agree exactly on when the warning
// starts and what counts as overdue. Never applies to TRIAL clinics (see
// isTrialExpired in features.ts for that separate lockout).
const WARN_DAYS_BEFORE_DUE = 7;

export interface PaymentReminderStatus {
  daysUntilDue: number;
  overdue: boolean;
}

export function getPaymentReminderStatus(
  nextPaymentDueAt: string | null | undefined,
): PaymentReminderStatus | null {
  if (!nextPaymentDueAt) return null;

  const daysUntilDue = Math.ceil(
    (new Date(nextPaymentDueAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  if (daysUntilDue > WARN_DAYS_BEFORE_DUE) return null;

  return { daysUntilDue, overdue: daysUntilDue < 0 };
}
