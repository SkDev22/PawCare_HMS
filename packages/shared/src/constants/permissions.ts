export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ:       ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN'] as const,

  // Patient records
  PATIENT_READ:         ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN'] as const,
  PATIENT_WRITE:        ['ADMIN', 'VETERINARIAN', 'RECEPTIONIST'] as const,
  PATIENT_DELETE:       ['ADMIN'] as const,
  MEDICAL_RECORD_READ:  ['ADMIN', 'VETERINARIAN', 'NURSE'] as const,
  MEDICAL_RECORD_WRITE: ['ADMIN', 'VETERINARIAN'] as const,
  SOAP_NOTE_WRITE:      ['ADMIN', 'VETERINARIAN'] as const,
  // Before/after edit history — deliberately narrower than MEDICAL_RECORD_READ.
  AUDIT_LOG_READ:       ['ADMIN'] as const,

  // Appointments
  APPOINTMENT_READ:     ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'] as const,
  APPOINTMENT_WRITE:    ['ADMIN', 'RECEPTIONIST', 'VETERINARIAN'] as const,
  APPOINTMENT_CANCEL:   ['ADMIN', 'RECEPTIONIST'] as const,

  // Billing
  INVOICE_READ:         ['ADMIN', 'RECEPTIONIST', 'VETERINARIAN'] as const,
  INVOICE_WRITE:        ['ADMIN', 'RECEPTIONIST'] as const,
  PAYMENT_PROCESS:      ['ADMIN', 'RECEPTIONIST'] as const,
  // Voiding a recorded payment reverses real money already logged — kept
  // ADMIN-only, unlike recording one, given the overpayment risk this closes.
  PAYMENT_VOID:         ['ADMIN'] as const,

  // Inventory
  INVENTORY_READ:       ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'] as const,
  INVENTORY_WRITE:      ['ADMIN', 'NURSE', 'LAB_TECHNICIAN', 'RECEPTIONIST'] as const,
  // Second sign-off on a controlled-substance dispense — narrower than
  // INVENTORY_WRITE (excludes RECEPTIONIST) since this is a clinical
  // judgment call, not a stock/billing one.
  CONTROLLED_SUBSTANCE_APPROVE: ['ADMIN', 'NURSE', 'LAB_TECHNICIAN'] as const,

  // Staff management
  STAFF_READ:           ['ADMIN'] as const,
  STAFF_WRITE:          ['ADMIN'] as const,

  // Clinic profile — read is broad (every printable letterhead needs the
  // clinic's name/address/phone), write stays ADMIN-only.
  CLINIC_READ:          ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN'] as const,
  CLINIC_WRITE:         ['ADMIN'] as const,

  // Reports
  REPORT_READ:          ['ADMIN', 'VETERINARIAN'] as const,

  // Lab
  LAB_ORDER_WRITE:      ['ADMIN', 'VETERINARIAN', 'LAB_TECHNICIAN'] as const,
  LAB_RESULT_WRITE:     ['ADMIN', 'LAB_TECHNICIAN'] as const,

  // Ward
  WARD_READ:            ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'] as const,
  WARD_WRITE:           ['ADMIN', 'NURSE', 'VETERINARIAN'] as const,
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
