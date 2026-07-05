import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { clampZero } from '../billing/billing.service';
import { applyStockChangeTx } from '../inventory/inventory.service';
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
  CreateChargeInput,
} from '@pawcare/shared';

type TxClient = Prisma.TransactionClient;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function assertRecordInClinic(recordId: string, clinicId: string, client: TxClient = prisma) {
  const record = await client.medicalRecord.findFirst({
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
    include: {
      item:   { select: { id: true, name: true } },
      charge: { select: { id: true, total: true } },
    },
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
  return prisma.$transaction(async (tx) => {
    const record = await assertRecordInClinic(recordId, clinicId, tx);

    // When the drug is dispensed from clinic stock (item_id given), also create the
    // matching billing charge + stock deduction in the same transaction, so the Rx
    // and the bill can never drift apart. Pharmacy-fulfilled drugs (no item_id) are
    // documentation-only — nothing is billed or deducted.
    let chargeId: string | null = null;
    if (data.item_id) {
      const charge = await createChargeTx(tx, recordId, clinicId, prescribedBy, {
        item_id: data.item_id,
        quantity: data.quantity ?? 1,
        description: data.drug_name,
      });
      chargeId = charge.id;
    }

    return tx.prescription.create({
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
        ...(data.item_id ? { item_id: data.item_id } : {}),
        ...(chargeId    ? { charge_id: chargeId }    : {}),
      },
      include: {
        item:   { select: { id: true, name: true } },
        charge: { select: { id: true, total: true } },
      },
    });
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

export async function deactivatePrescription(rxId: string, clinicId: string, staffId: string) {
  return prisma.$transaction(async (tx) => {
    const rx = await tx.prescription.findFirst({
      where: { id: rxId, pet: { owner: { clinic_id: clinicId } } },
      select: { id: true, medical_record_id: true, charge_id: true },
    });
    if (!rx) throw new AppError('NOT_FOUND', 'Prescription not found', 404);

    await tx.prescription.update({
      where: { id: rxId },
      data: { is_active: false },
    });

    // If this Rx was dispensed from clinic stock, reverse the billing/stock effects too —
    // but only while the invoice is still editable (never touch a paid/finalized invoice).
    if (rx.charge_id && rx.medical_record_id) {
      const charge = await tx.medicalRecordCharge.findUnique({
        where: { id: rx.charge_id },
        select: { invoice_line_item: { select: { invoice: { select: { status: true } } } } },
      });
      const invoiceStatus = charge?.invoice_line_item?.invoice.status;
      if (!invoiceStatus || ['DRAFT', 'SENT'].includes(invoiceStatus)) {
        await removeChargeTx(tx, rx.medical_record_id, rx.charge_id, clinicId, staffId);
      }
    }
  });
}

// ── Charges (visit → invoice bridge) ───────────────────────────────────────────

const chargeIncludes = {
  item:    { select: { id: true, name: true, category: true, unit: true } },
  service: { select: { id: true, name: true, category: true } },
} as const;

export async function listCharges(recordId: string, clinicId: string) {
  await assertRecordInClinic(recordId, clinicId);

  return prisma.medicalRecordCharge.findMany({
    where: { medical_record_id: recordId },
    include: chargeIncludes,
    orderBy: { created_at: 'asc' },
  });
}

async function createChargeTx(
  tx: TxClient,
  recordId: string,
  clinicId: string,
  staffId: string,
  data: CreateChargeInput,
) {
  const record = await tx.medicalRecord.findFirst({
    where: { id: recordId, pet: { owner: { clinic_id: clinicId } } },
    select: {
      id: true,
      appointment_id: true,
      pet: { select: { owner_id: true } },
    },
  });
  if (!record) throw new AppError('NOT_FOUND', 'Medical record not found', 404);

  let unitPrice: Decimal;
  let description: string;
  let resolvedItemId: string | null = null;

  if (data.item_id) {
    const item = await tx.inventoryItem.findFirst({
      where: { id: data.item_id, clinic_id: clinicId, is_active: true },
    });
    if (!item) throw new AppError('NOT_FOUND', 'Inventory item not found', 404);
    if (item.selling_price === null) {
      throw new AppError('BAD_REQUEST', `"${item.name}" has no selling price configured`, 400);
    }
    unitPrice = item.selling_price;
    description = data.description ?? item.name;
    resolvedItemId = item.id;
  } else {
    const serviceId = data.service_id;
    if (!serviceId) throw new AppError('BAD_REQUEST', 'Either item_id or service_id is required', 400);
    const service = await tx.service.findFirst({
      where: { id: serviceId, clinic_id: clinicId, is_active: true },
    });
    if (!service) throw new AppError('NOT_FOUND', 'Service not found', 404);
    unitPrice = service.price;
    description = data.description ?? service.name;
  }

  const total = unitPrice.times(data.quantity);

  // Resolve the invoice this charge belongs to: prefer the appointment's invoice,
  // otherwise reuse whichever invoice this record's earlier charges (if any) already
  // billed to, otherwise start a fresh one. A record isn't required to have an
  // appointment — most are created directly from the EMR screen without one.
  let invoice = record.appointment_id
    ? await tx.invoice.findUnique({ where: { appointment_id: record.appointment_id } })
    : null;

  if (!invoice) {
    const priorCharge = await tx.medicalRecordCharge.findFirst({
      where: { medical_record_id: recordId, invoice_line_item_id: { not: null } },
      select: { invoice_line_item: { select: { invoice_id: true } } },
      orderBy: { created_at: 'asc' },
    });
    if (priorCharge?.invoice_line_item) {
      invoice = await tx.invoice.findUnique({ where: { id: priorCharge.invoice_line_item.invoice_id } });
    }
  }

  if (!invoice) {
    invoice = await tx.invoice.create({
      data: {
        clinic_id: clinicId,
        owner_id: record.pet.owner_id,
        ...(record.appointment_id ? { appointment_id: record.appointment_id } : {}),
        subtotal: new Decimal(0),
        tax_amount: new Decimal(0),
        discount_amount: new Decimal(0),
        total: new Decimal(0),
        paid_amount: new Decimal(0),
      },
    });
  }
  if (!['DRAFT', 'SENT'].includes(invoice.status)) {
    throw new AppError('BAD_REQUEST', 'Cannot add charges to a finalized invoice', 400);
  }

  const lineItem = await tx.invoiceLineItem.create({
    data: {
      invoice_id: invoice.id,
      ...(data.item_id ? { item_id: data.item_id } : {}),
      ...(data.service_id ? { service_id: data.service_id } : {}),
      description,
      quantity: data.quantity,
      unit_price: unitPrice,
      total,
    },
  });

  const newSubtotal = invoice.subtotal.plus(total);
  const newTotal = clampZero(newSubtotal.plus(invoice.tax_amount).minus(invoice.discount_amount));
  await tx.invoice.update({
    where: { id: invoice.id },
    data: { subtotal: newSubtotal, total: newTotal },
  });

  const charge = await tx.medicalRecordCharge.create({
    data: {
      medical_record_id: recordId,
      ...(data.item_id ? { item_id: data.item_id } : {}),
      ...(data.service_id ? { service_id: data.service_id } : {}),
      description,
      quantity: data.quantity,
      unit_price: unitPrice,
      total,
      invoice_line_item_id: lineItem.id,
      created_by: staffId,
    },
    include: chargeIncludes,
  });

  if (resolvedItemId) {
    await applyStockChangeTx(tx, resolvedItemId, clinicId, staffId, {
      type: 'dispensed',
      quantity: -data.quantity,
      reference_id: charge.id,
      notes: `Dispensed for visit ${recordId}`,
    });
  }

  return charge;
}

export async function addCharge(
  recordId: string,
  clinicId: string,
  staffId: string,
  data: CreateChargeInput,
) {
  return prisma.$transaction((tx) => createChargeTx(tx, recordId, clinicId, staffId, data));
}

async function removeChargeTx(
  tx: TxClient,
  recordId: string,
  chargeId: string,
  clinicId: string,
  staffId: string,
) {
  const charge = await tx.medicalRecordCharge.findFirst({
    where: { id: chargeId, medical_record_id: recordId, medical_record: { pet: { owner: { clinic_id: clinicId } } } },
    include: { invoice_line_item: { include: { invoice: true } } },
  });
  if (!charge) throw new AppError('NOT_FOUND', 'Charge not found', 404);

  const invoice = charge.invoice_line_item?.invoice;
  if (invoice && !['DRAFT', 'SENT'].includes(invoice.status)) {
    throw new AppError('BAD_REQUEST', 'Cannot remove a charge from a finalized invoice', 400);
  }

  await tx.medicalRecordCharge.delete({ where: { id: chargeId } });

  if (charge.invoice_line_item_id) {
    await tx.invoiceLineItem.delete({ where: { id: charge.invoice_line_item_id } });
  }

  if (invoice) {
    const newSubtotal = clampZero(invoice.subtotal.minus(charge.total));
    const newTotal = clampZero(newSubtotal.plus(invoice.tax_amount).minus(invoice.discount_amount));
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { subtotal: newSubtotal, total: newTotal },
    });
  }

  if (charge.item_id) {
    await applyStockChangeTx(tx, charge.item_id, clinicId, staffId, {
      type: 'adjustment',
      quantity: charge.quantity,
      reference_id: charge.id,
      notes: `Reversed charge for visit ${recordId}`,
    });
  }
}

export async function removeCharge(recordId: string, chargeId: string, clinicId: string, staffId: string) {
  return prisma.$transaction((tx) => removeChargeTx(tx, recordId, chargeId, clinicId, staffId));
}
