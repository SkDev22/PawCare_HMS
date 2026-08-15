// Canonical catalog of every notification `type` string producers actually
// emit (see notifyStaff/notifyRole call sites across the server modules).
// Kept here so the Settings preferences UI and the backend gate check the
// same list instead of drifting apart.
export const NOTIFICATION_TYPES = [
  { type: 'appointment_created', label: 'New appointment booked' },
  { type: 'appointment_reassigned', label: 'Appointment reassigned to me' },
  { type: 'appointment_checked_in', label: 'Patient checked in' },
  { type: 'ward_admission', label: 'Ward admission' },
  { type: 'ward_discharge', label: 'Ward discharge' },
  { type: 'schedule_changed', label: 'My schedule changed' },
  { type: 'payment_recorded', label: 'Payment recorded' },
  { type: 'low_stock', label: 'Low stock alert' },
  { type: 'controlled_substance_dispensed', label: 'Controlled substance dispensed' },
  { type: 'lab_result_abnormal', label: 'Abnormal lab result' },
  { type: 'invoice_overdue', label: 'Invoice overdue (daily alert)' },
  { type: 'daily_digest', label: 'Daily digest summary' },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['type'];
