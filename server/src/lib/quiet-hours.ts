// Never send owner-facing notifications between 10pm and 8am clinic-local
// time. A clinic in its quiet window is skipped entirely for that job run —
// its reminders fire on the next run once a fresh window applies.
export function isQuietHours(timezone: string, now: Date = new Date()): boolean {
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      }).format(now),
    );
  } catch {
    // Unknown/invalid timezone string — fail open rather than silently
    // blocking every reminder for a misconfigured clinic.
    return false;
  }

  if (hour === 24) hour = 0;
  return hour >= 22 || hour < 8;
}
