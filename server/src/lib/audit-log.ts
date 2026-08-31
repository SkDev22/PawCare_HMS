import { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

// JSON.stringify already calls .toJSON() on Decimal and Date instances
// (decimal.js and Date both implement it), so round-tripping through it is
// enough to turn a raw Prisma row into something the Json column can store
// — no per-entity-type serialization needed.
function toJsonSafe(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export interface RecordAuditLogParams {
  clinicId: string;
  medicalRecordId?: string;
  entityType: 'MedicalRecord' | 'SoapNote' | 'Vitals' | 'Diagnosis' | 'Prescription' | 'MedicalRecordCharge' | 'Payment' | 'StaffUser';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  before?: unknown;
  after?: unknown;
  performedBy: string;
}

// Called from inside the same transaction as the mutation it describes —
// if the audit write fails, the mutation it would have described rolls
// back too, which is the point: a trail that can silently fall out of
// sync with the data isn't trustworthy.
export async function recordAuditLog(tx: TxClient, params: RecordAuditLogParams): Promise<void> {
  await tx.auditLog.create({
    data: {
      clinic_id:         params.clinicId,
      medical_record_id: params.medicalRecordId ?? null,
      entity_type:       params.entityType,
      entity_id:         params.entityId,
      action:            params.action,
      before:            toJsonSafe(params.before),
      after:             toJsonSafe(params.after),
      performed_by:      params.performedBy,
    },
  });
}
