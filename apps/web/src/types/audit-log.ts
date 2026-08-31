export type AuditEntityType =
  | "MedicalRecord"
  | "SoapNote"
  | "Vitals"
  | "Diagnosis"
  | "Prescription"
  | "MedicalRecordCharge"
  | "Payment"
  | "StaffUser";

export type AuditLogEntry = {
  id: string;
  clinic_id: string;
  medical_record_id: string | null;
  entity_type: AuditEntityType;
  entity_id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  performed_by: string;
  performed_by_staff: { id: string; first_name: string; last_name: string } | null;
  created_at: string;
};

export type PaginatedAuditLog = {
  items: AuditLogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
};
