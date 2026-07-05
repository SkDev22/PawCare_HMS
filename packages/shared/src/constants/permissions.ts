export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ:       ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN'] as const,

  // Patient records
  PATIENT_READ:         ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'] as const,
  PATIENT_WRITE:        ['ADMIN', 'VETERINARIAN'] as const,
  MEDICAL_RECORD_READ:  ['ADMIN', 'VETERINARIAN', 'NURSE'] as const,
  MEDICAL_RECORD_WRITE: ['ADMIN', 'VETERINARIAN'] as const,
  SOAP_NOTE_WRITE:      ['ADMIN', 'VETERINARIAN'] as const,

  // Appointments
  APPOINTMENT_READ:     ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'] as const,
  APPOINTMENT_WRITE:    ['ADMIN', 'RECEPTIONIST', 'VETERINARIAN'] as const,
  APPOINTMENT_CANCEL:   ['ADMIN', 'RECEPTIONIST'] as const,

  // Billing
  INVOICE_READ:         ['ADMIN', 'RECEPTIONIST', 'VETERINARIAN'] as const,
  INVOICE_WRITE:        ['ADMIN', 'RECEPTIONIST'] as const,
  PAYMENT_PROCESS:      ['ADMIN', 'RECEPTIONIST'] as const,

  // Inventory
  INVENTORY_READ:       ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'] as const,
  INVENTORY_WRITE:      ['ADMIN', 'NURSE', 'LAB_TECHNICIAN'] as const,

  // Staff management
  STAFF_READ:           ['ADMIN'] as const,
  STAFF_WRITE:          ['ADMIN'] as const,

  // Reports
  REPORT_READ:          ['ADMIN', 'VETERINARIAN'] as const,

  // Lab
  LAB_ORDER_WRITE:      ['ADMIN', 'VETERINARIAN', 'LAB_TECHNICIAN'] as const,
  LAB_RESULT_WRITE:     ['ADMIN', 'LAB_TECHNICIAN'] as const,

  // Ward
  WARD_READ:            ['ADMIN', 'VETERINARIAN', 'NURSE'] as const,
  WARD_WRITE:           ['ADMIN', 'NURSE', 'VETERINARIAN'] as const,
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
