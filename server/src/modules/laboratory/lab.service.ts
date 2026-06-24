import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type {
  CreateLabOrderInput,
  LabOrderQueryInput,
  AddLabResultsBatchInput,
  LabStatusType,
} from '@pawcare/shared';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<LabStatusType, LabStatusType[]> = {
  PENDING:          ['SAMPLE_COLLECTED', 'CANCELLED'],
  SAMPLE_COLLECTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:      ['COMPLETED', 'CANCELLED'],
  COMPLETED:        [],
  CANCELLED:        [],
};

const orderListIncludes = {
  pet: {
    select: {
      id:      true,
      name:    true,
      species: true,
      owner:   { select: { id: true, first_name: true, last_name: true } },
    },
  },
  vet: {
    select: { id: true, first_name: true, last_name: true, role: true },
  },
  _count: { select: { results: true } },
} as const;

const orderFullIncludes = {
  pet: {
    select: {
      id:      true,
      name:    true,
      species: true,
      breed:   true,
      owner:   { select: { id: true, first_name: true, last_name: true, phone: true } },
    },
  },
  vet: {
    select: { id: true, first_name: true, last_name: true, role: true },
  },
  results: {
    orderBy: { recorded_at: 'asc' as const },
    select: {
      id:                true,
      lab_order_id:      true,
      medical_record_id: true,
      test_name:         true,
      value:             true,
      unit:              true,
      reference_min:     true,
      reference_max:     true,
      is_abnormal:       true,
      recorded_at:       true,
    },
  },
} as const;

async function assertOrder(id: string, clinicId: string) {
  const order = await prisma.labOrder.findFirst({
    where: { id, pet: { owner: { clinic_id: clinicId } } },
    select: { id: true, status: true, ordered_by: true },
  });
  if (!order) throw new AppError('NOT_FOUND', 'Lab order not found', 404);
  return order;
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listOrders(clinicId: string, params: LabOrderQueryInput) {
  const { pet_id, status, date_from, date_to, cursor, limit } = params;

  const where = {
    pet: { owner: { clinic_id: clinicId } },
    ...(pet_id ? { pet_id }   : {}),
    ...(status ? { status }   : {}),
    ...(date_from || date_to ? {
      ordered_at: {
        ...(date_from ? { gte: new Date(date_from) } : {}),
        ...(date_to   ? { lte: new Date(`${date_to}T23:59:59.999Z`) } : {}),
      },
    } : {}),
    ...(cursor ? { id: { gt: cursor } } : {}),
  };

  const items = await prisma.labOrder.findMany({
    where,
    include: orderListIncludes,
    orderBy: { ordered_at: 'desc' },
    take:    limit + 1,
  });

  const hasMore = items.length > limit;
  const result  = hasMore ? items.slice(0, limit) : items;

  return {
    items:      result,
    nextCursor: hasMore ? result[result.length - 1].id : null,
    hasMore,
  };
}

export async function getOrder(id: string, clinicId: string) {
  const order = await prisma.labOrder.findFirst({
    where:   { id, pet: { owner: { clinic_id: clinicId } } },
    include: orderFullIncludes,
  });
  if (!order) throw new AppError('NOT_FOUND', 'Lab order not found', 404);
  return order;
}

export async function createOrder(
  clinicId: string,
  staffId:  string,
  data:     CreateLabOrderInput,
) {
  // Verify the pet belongs to this clinic
  const pet = await prisma.pet.findFirst({
    where:  { id: data.pet_id, owner: { clinic_id: clinicId }, deleted_at: null },
    select: { id: true },
  });
  if (!pet) throw new AppError('NOT_FOUND', 'Pet not found', 404);

  // Verify medical record belongs to this clinic/pet if provided
  if (data.medical_record_id) {
    const rec = await prisma.medicalRecord.findFirst({
      where:  { id: data.medical_record_id, pet_id: data.pet_id },
      select: { id: true },
    });
    if (!rec) throw new AppError('NOT_FOUND', 'Medical record not found or does not belong to this pet', 404);
  }

  const order = await prisma.labOrder.create({
    data: {
      pet_id:     data.pet_id,
      ordered_by: staffId,
      panel_name: data.panel_name,
      ...(data.is_external       ? { is_external:       data.is_external }       : {}),
      ...(data.external_lab_name ? { external_lab_name: data.external_lab_name } : {}),
      ...(data.notes             ? { notes:             data.notes }             : {}),
    },
    include: orderFullIncludes,
  });

  return order;
}

export async function updateStatus(
  id:        string,
  clinicId:  string,
  newStatus: LabStatusType,
) {
  const order = await assertOrder(id, clinicId);
  const allowed = STATUS_TRANSITIONS[order.status as LabStatusType];

  if (!allowed.includes(newStatus)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cannot transition from ${order.status} to ${newStatus}`,
      422,
    );
  }

  return prisma.labOrder.update({
    where: { id },
    data: {
      status:       newStatus,
      ...(newStatus === 'COMPLETED' ? { completed_at: new Date() } : {}),
    },
    include: orderFullIncludes,
  });
}

export async function addResults(
  orderId:  string,
  clinicId: string,
  data:     AddLabResultsBatchInput,
) {
  const order = await assertOrder(orderId, clinicId);

  if (order.status === 'COMPLETED') {
    throw new AppError('FORBIDDEN', 'Cannot add results to a completed order', 403);
  }
  if (order.status === 'CANCELLED') {
    throw new AppError('FORBIDDEN', 'Cannot add results to a cancelled order', 403);
  }

  const abnormalResults = data.results.filter((r) => r.is_abnormal);

  const results = await prisma.$transaction(async (tx) => {
    const created = await tx.labResult.createMany({
      data: data.results.map((r) => ({
        lab_order_id:      orderId,
        test_name:         r.test_name,
        value:             r.value,
        is_abnormal:       r.is_abnormal,
        ...(r.unit              ? { unit:              r.unit }              : {}),
        ...(r.reference_min     ? { reference_min:     r.reference_min }     : {}),
        ...(r.reference_max     ? { reference_max:     r.reference_max }     : {}),
        ...(r.medical_record_id ? { medical_record_id: r.medical_record_id } : {}),
      })),
    });

    // Notify the ordering vet for any abnormal results
    if (abnormalResults.length > 0) {
      await tx.notification.create({
        data: {
          staff_id: order.ordered_by,
          type:     'lab_result_abnormal',
          channel:  'in_app',
          subject:  'Abnormal Lab Results',
          body:     `${abnormalResults.length} abnormal result(s) were recorded on lab order ${orderId}. Tests: ${abnormalResults.map((r) => r.test_name).join(', ')}.`,
          status:   'SENT',
          sent_at:  new Date(),
        },
      });
    }

    return created;
  });

  // Return the full order with newly added results
  return getOrder(orderId, clinicId);
}
