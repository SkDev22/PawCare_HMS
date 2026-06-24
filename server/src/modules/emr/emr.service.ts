import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  CreateMedicalRecordInput,
  UpdateMedicalRecordInput,
  MedicalRecordQueryInput,
  UpsertSoapNoteInput,
  UpsertVitalsInput,
  CreateDiagnosisInput,
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from '@pawcare/shared';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function assertRecordInClinic(recordId: string, clinicId: string) {
  const record = await prisma.medicalRecord.findFirst({
    where: {
      id: recordId,
      pet: { owner: { clinic_id: clinicId } },
    },
    select: { id: true, pet_id: true },
  });
  if (!record) throw new AppError('NOT_FOUND', 'Medical record not found', 404);
  return record;
}

const recordListIncludes = {
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      owner: { select: { id: true, first_name: true, last_name: true } },
    },
  },
  vet: {
    select: { id: true, first_name: true, last_name: true, role: true },
  },
  diagnoses: {
    orderBy: { is_primary: 'desc' as const },
    take: 3,
  },
  _count: {
    select: { prescriptions: true, lab_results: true },
  },
} as const;

const recordFullIncludes = {
  pet: {
    include: {
      owner: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          phone: true,
          email: true,
        },
      },
      allergies: { orderBy: { noted_at: 'desc' as const }, take: 10 },
    },
  },
  vet: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      role: true,
      specialization: true,
      avatar_url: true,
    },
  },
  appointment: {
    select: { id: true, type: true, status: true, start_at: true, end_at: true },
  },
  soap_note: {
    include: {
      vet: { select: { id: true, first_name: true, last_name: true } },
    },
  },
  vitals: true,
  diagnoses: { orderBy: { is_primary: 'desc' as const } },
  prescriptions: {
    where: { is_active: true },
    orderBy: { created_at: 'desc' as const },
  },
  lab_results: {
    take: 20,
    orderBy: { recorded_at: 'desc' as const },
  },
  _count: { select: { attachments: true } },
} as const;

// ── Medical Records ────────────────────────────────────────────────────────────

export async function listRecords(clinicId: string, query: MedicalRecordQueryInput) {
  const { search, pet_id, vet_id, date_from, date_to, cursor, limit } = query;

  const records = await prisma.medicalRecord.findMany({
    where: {
      pet: {
        owner: { clinic_id: clinicId },
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      ...(pet_id ? { pet_id } : {}),
      ...(vet_id ? { vet_id } : {}),
      ...((date_from ?? date_to)
        ? {
            visit_date: {
              ...(date_from ? { gte: new Date(`${date_from}T00:00:00.000Z`) } : {}),
              ...(date_to   ? { lte: new Date(`${date_to}T23:59:59.999Z`)   } : {}),
            },
          }
        : {}),
    },
    include: recordListIncludes,
    orderBy: { visit_date: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = records.length > limit;
  const items   = hasMore ? records.slice(0, limit) : records;
  return {
    items,
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

export async function getRecord(id: string, clinicId: string) {
  const record = await prisma.medicalRecord.findFirst({
    where: { id, pet: { owner: { clinic_id: clinicId } } },
    include: recordFullIncludes,
  });
  if (!record) throw new AppError('NOT_FOUND', 'Medical record not found', 404);
  return record;
}

export async function createRecord(
  clinicId: string,
  vetId: string,
  data: CreateMedicalRecordInput,
) {
  const pet = await prisma.pet.findFirst({
    where: { id: data.pet_id, deleted_at: null, owner: { clinic_id: clinicId } },
    select: { id: true },
  });
  if (!pet) throw new AppError('NOT_FOUND', 'Pet not found in this clinic', 404);

  if (data.appointment_id) {
    const appt = await prisma.appointment.findFirst({
      where: { id: data.appointment_id, clinic_id: clinicId },
      select: { id: true, medical_record: { select: { id: true } } },
    });
    if (!appt) throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    if (appt.medical_record) {
      throw new AppError('CONFLICT', 'A medical record already exists for this appointment', 409);
    }
  }

  const resolvedVetId = data.vet_id ?? vetId;

  return prisma.medicalRecord.create({
    data: {
      pet_id:          data.pet_id,
      vet_id:          resolvedVetId,
      visit_date:      data.visit_date ? new Date(data.visit_date) : new Date(),
      chief_complaint: data.chief_complaint ?? null,
      ...(data.appointment_id ? { appointment_id: data.appointment_id } : {}),
    },
    include: recordFullIncludes,
  });
}

export async function updateRecord(
  id: string,
  clinicId: string,
  data: UpdateMedicalRecordInput,
) {
  await assertRecordInClinic(id, clinicId);

  return prisma.medicalRecord.update({
    where: { id },
    data: {
      ...(data.chief_complaint !== undefined ? { chief_complaint: data.chief_complaint } : {}),
      ...(data.visit_date      !== undefined ? { visit_date: new Date(data.visit_date) } : {}),
    },
    include: recordFullIncludes,
  });
}

// ── SOAP Notes ─────────────────────────────────────────────────────────────────

export async function upsertSoapNote(
  recordId: string,
  clinicId: string,
  vetId: string,
  data: UpsertSoapNoteInput,
) {
  await assertRecordInClinic(recordId, clinicId);

  return prisma.soapNote.upsert({
    where: { medical_record_id: recordId },
    create: {
      medical_record_id: recordId,
      vet_id:    vetId,
      subjective: data.subjective ?? null,
      objective:  data.objective  ?? null,
      assessment: data.assessment ?? null,
      plan:       data.plan       ?? null,
    },
    update: {
      ...(data.subjective !== undefined ? { subjective: data.subjective } : {}),
      ...(data.objective  !== undefined ? { objective:  data.objective  } : {}),
      ...(data.assessment !== undefined ? { assessment: data.assessment } : {}),
      ...(data.plan       !== undefined ? { plan:       data.plan       } : {}),
    },
    include: {
      vet: { select: { id: true, first_name: true, last_name: true } },
    },
  });
}

// ── Vitals ─────────────────────────────────────────────────────────────────────

export async function upsertVitals(
  recordId: string,
  clinicId: string,
  data: UpsertVitalsInput,
) {
  await assertRecordInClinic(recordId, clinicId);

  const sharedVitalsData = {
    weight_kg:            data.weight_kg    !== undefined ? new Decimal(data.weight_kg)    : null,
    temperature_c:        data.temperature_c !== undefined ? new Decimal(data.temperature_c) : null,
    heart_rate_bpm:       data.heart_rate_bpm       ?? null,
    respiratory_rate:     data.respiratory_rate     ?? null,
    blood_pressure:       data.blood_pressure       ?? null,
    body_condition_score: data.body_condition_score ?? null,
  };

  return prisma.vitals.upsert({
    where:  { medical_record_id: recordId },
    create: { medical_record_id: recordId, ...sharedVitalsData },
    update: {
      ...(data.weight_kg    !== undefined ? { weight_kg:    new Decimal(data.weight_kg) }    : {}),
      ...(data.temperature_c !== undefined ? { temperature_c: new Decimal(data.temperature_c) } : {}),
      ...(data.heart_rate_bpm       !== undefined ? { heart_rate_bpm:       data.heart_rate_bpm }       : {}),
      ...(data.respiratory_rate     !== undefined ? { respiratory_rate:     data.respiratory_rate }     : {}),
      ...(data.blood_pressure       !== undefined ? { blood_pressure:       data.blood_pressure }       : {}),
      ...(data.body_condition_score !== undefined ? { body_condition_score: data.body_condition_score } : {}),
    },
  });
}

// ── Diagnoses ──────────────────────────────────────────────────────────────────

export async function addDiagnosis(
  recordId: string,
  clinicId: string,
  data: CreateDiagnosisInput,
) {
  await assertRecordInClinic(recordId, clinicId);

  return prisma.diagnosis.create({
    data: {
      medical_record_id: recordId,
      code:       data.code  ?? null,
      name:       data.name,
      is_primary: data.is_primary,
      notes:      data.notes ?? null,
    },
  });
}

export async function removeDiagnosis(
  recordId: string,
  diagnosisId: string,
  clinicId: string,
) {
  await assertRecordInClinic(recordId, clinicId);

  const dx = await prisma.diagnosis.findFirst({
    where: { id: diagnosisId, medical_record_id: recordId },
    select: { id: true },
  });
  if (!dx) throw new AppError('NOT_FOUND', 'Diagnosis not found', 404);

  await prisma.diagnosis.delete({ where: { id: diagnosisId } });
}

// ── Prescriptions ──────────────────────────────────────────────────────────────

export async function addPrescription(
  recordId: string,
  clinicId: string,
  prescribedBy: string,
  data: CreatePrescriptionInput,
) {
  const record = await assertRecordInClinic(recordId, clinicId);

  return prisma.prescription.create({
    data: {
      pet_id:            record.pet_id,
      medical_record_id: recordId,
      prescribed_by:     prescribedBy,
      drug_name:         data.drug_name,
      dosage:            data.dosage,
      frequency:         data.frequency,
      duration_days:     data.duration_days    ?? null,
      quantity:          data.quantity          ?? null,
      refills_remaining: data.refills_remaining,
      instructions:      data.instructions     ?? null,
      dispensed_at:      data.dispensed_at ? new Date(data.dispensed_at) : null,
      expires_at:        data.expires_at   ? new Date(data.expires_at)   : null,
    },
  });
}

export async function updatePrescription(
  rxId: string,
  clinicId: string,
  data: UpdatePrescriptionInput,
) {
  const rx = await prisma.prescription.findFirst({
    where: { id: rxId, pet: { owner: { clinic_id: clinicId } } },
    select: { id: true },
  });
  if (!rx) throw new AppError('NOT_FOUND', 'Prescription not found', 404);

  return prisma.prescription.update({
    where: { id: rxId },
    data: {
      ...(data.drug_name         !== undefined ? { drug_name:         data.drug_name }         : {}),
      ...(data.dosage            !== undefined ? { dosage:            data.dosage }             : {}),
      ...(data.frequency         !== undefined ? { frequency:         data.frequency }          : {}),
      ...(data.duration_days     !== undefined ? { duration_days:     data.duration_days }      : {}),
      ...(data.quantity          !== undefined ? { quantity:          data.quantity }            : {}),
      ...(data.refills_remaining !== undefined ? { refills_remaining: data.refills_remaining }  : {}),
      ...(data.instructions      !== undefined ? { instructions:      data.instructions }        : {}),
      ...(data.is_active         !== undefined ? { is_active:         data.is_active }           : {}),
      ...(data.dispensed_at !== undefined
        ? { dispensed_at: data.dispensed_at ? new Date(data.dispensed_at) : null }
        : {}),
      ...(data.expires_at !== undefined
        ? { expires_at: data.expires_at ? new Date(data.expires_at) : null }
        : {}),
    },
  });
}

export async function deactivatePrescription(rxId: string, clinicId: string) {
  const rx = await prisma.prescription.findFirst({
    where: { id: rxId, pet: { owner: { clinic_id: clinicId } } },
    select: { id: true },
  });
  if (!rx) throw new AppError('NOT_FOUND', 'Prescription not found', 404);

  await prisma.prescription.update({
    where: { id: rxId },
    data: { is_active: false },
  });
}
