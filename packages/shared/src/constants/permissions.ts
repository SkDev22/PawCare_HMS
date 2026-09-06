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

  // Role/permission administration — deliberately not itself part of the
  // editable catalog below: an admin can't grant this away, or revoke it
  // from every admin and lock the clinic out of managing permissions.
  ROLE_PERMISSIONS_MANAGE: ['ADMIN'] as const,
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// Roles whose permissions a clinic ADMIN can override from the Settings UI.
// ADMIN is intentionally excluded — it always has every permission, so the
// existing "must always have at least one ADMIN" safety guard never has to
// reason about an admin who's had access edited away.
export const EDITABLE_ROLES = ['VETERINARIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN'] as const;
export type EditableRole = (typeof EDITABLE_ROLES)[number];

// Permission keys an ADMIN can actually toggle per role in the Settings UI —
// everything except ROLE_PERMISSIONS_MANAGE itself (see note above).
export const EDITABLE_PERMISSION_KEYS = (Object.keys(PERMISSIONS) as PermissionKey[]).filter(
  (key) => key !== 'ROLE_PERMISSIONS_MANAGE',
);

// Module grouping + human label for each editable permission, used to render
// the Roles & Permissions screen.
export const PERMISSION_CATALOG: Record<PermissionKey, { module: string; label: string }> = {
  DASHBOARD_READ:               { module: 'Dashboard',       label: 'View dashboard' },

  PATIENT_READ:                 { module: 'Patients',        label: 'View owners & pets' },
  PATIENT_WRITE:                { module: 'Patients',        label: 'Create & edit owners/pets' },
  PATIENT_DELETE:                { module: 'Patients',        label: 'Delete owners/pets' },
  MEDICAL_RECORD_READ:          { module: 'Medical Records',  label: 'View medical records' },
  MEDICAL_RECORD_WRITE:         { module: 'Medical Records',  label: 'Create & edit medical records' },
  SOAP_NOTE_WRITE:              { module: 'Medical Records',  label: 'Write SOAP notes' },
  AUDIT_LOG_READ:               { module: 'Medical Records',  label: 'View edit history (audit log)' },

  APPOINTMENT_READ:             { module: 'Appointments',     label: 'View appointments' },
  APPOINTMENT_WRITE:            { module: 'Appointments',     label: 'Create & edit appointments' },
  APPOINTMENT_CANCEL:           { module: 'Appointments',     label: 'Cancel appointments' },

  INVOICE_READ:                 { module: 'Billing',          label: 'View invoices' },
  INVOICE_WRITE:                { module: 'Billing',          label: 'Create & edit invoices' },
  PAYMENT_PROCESS:              { module: 'Billing',          label: 'Record payments' },
  PAYMENT_VOID:                 { module: 'Billing',          label: 'Void payments & process refunds' },

  INVENTORY_READ:                { module: 'Inventory',        label: 'View inventory' },
  INVENTORY_WRITE:               { module: 'Inventory',        label: 'Add & adjust inventory' },
  CONTROLLED_SUBSTANCE_APPROVE:  { module: 'Inventory',        label: 'Approve controlled substance dispensing' },

  STAFF_READ:                    { module: 'Staff',            label: 'View staff' },
  STAFF_WRITE:                   { module: 'Staff',            label: 'Create & edit staff' },

  CLINIC_READ:                   { module: 'Clinic',           label: 'View clinic profile' },
  CLINIC_WRITE:                  { module: 'Clinic',           label: 'Edit clinic profile' },

  REPORT_READ:                   { module: 'Reports',          label: 'View reports' },

  LAB_ORDER_WRITE:               { module: 'Laboratory',       label: 'Create lab orders' },
  LAB_RESULT_WRITE:              { module: 'Laboratory',       label: 'Record lab results' },

  WARD_READ:                     { module: 'Ward',             label: 'View ward & kennels' },
  WARD_WRITE:                    { module: 'Ward',             label: 'Admit, discharge & log ward care' },

  ROLE_PERMISSIONS_MANAGE:       { module: 'Clinic',           label: 'Manage role permissions' },
};
