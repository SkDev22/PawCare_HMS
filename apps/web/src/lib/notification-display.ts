// Shared by the notification bell dropdown and the full Notifications page,
// so the two don't drift into two different label sets for the same type
// strings (they previously each had their own partial copy of this map).

const TITLES: Record<string, string> = {
  lab_result_abnormal:                    'Abnormal Lab Result',
  appointment_reminder:                   'Appointment Reminder',
  appointment_created:                    'New Appointment',
  appointment_reassigned:                 'Appointment Assigned to You',
  appointment_checked_in:                 'Patient Checked In',
  vaccine_due:                            'Vaccine Due',
  invoice_overdue:                        'Invoice Overdue',
  payment_recorded:                       'Payment Recorded',
  low_stock:                              'Low Stock Alert',
  controlled_substance_dispensed:         'Controlled Substance Dispensed',
  controlled_substance_pending_approval:  'Controlled Substance Approval Needed',
  ward_admission:                         'Patient Admitted',
  ward_discharge:                         'Patient Discharged',
  schedule_changed:                       'Schedule Updated',
  daily_digest:                           'Daily Summary',
  system:                                 'System',
};

export function notifTitle(type: string): string {
  return TITLES[type] ?? type.replace(/_/g, ' ');
}

// Only mapped for types that land on one specific, unambiguous page — every
// one of these three surfaces on Inventory > Alerts. Types like lab results
// or appointments aren't mapped: the notification carries no entity id to
// deep-link to (Notification has no reference/link field), so a generic
// list page would be a guess, not a real destination.
const LINKS: Record<string, string> = {
  low_stock:                             '/inventory/alerts',
  controlled_substance_dispensed:        '/inventory/alerts',
  controlled_substance_pending_approval: '/inventory/alerts',
};

export function notifLink(type: string): string | undefined {
  return LINKS[type];
}
