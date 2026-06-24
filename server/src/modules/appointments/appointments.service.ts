import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
  AppointmentQueryInput,
  CreateRoomInput,
} from '@pawcare/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end   = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

async function assertNoConflict(
  vetId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string,
) {
  const conflict = await prisma.appointment.findFirst({
    where: {
      vet_id: vetId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      AND: [{ start_at: { lt: endAt } }, { end_at: { gt: startAt } }],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, start_at: true, end_at: true },
  });

  if (conflict) {
    throw new AppError(
      'CONFLICT',
      'The selected veterinarian already has an appointment during this time slot',
      409,
    );
  }
}

const appointmentIncludes = {
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      owner: { select: { id: true, first_name: true, last_name: true, phone: true } },
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
  room: { select: { id: true, name: true, type: true } },
} as const;

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function listAppointments(clinicId: string, query: AppointmentQueryInput) {
  const { date, status, vet_id, pet_id, cursor, limit } = query;
  const dateFilter = date ? dayBounds(date) : null;

  const appointments = await prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      ...(dateFilter ? { start_at: { gte: dateFilter.start, lte: dateFilter.end } } : {}),
      ...(status  ? { status }   : {}),
      ...(vet_id  ? { vet_id }   : {}),
      ...(pet_id  ? { pet_id }   : {}),
    },
    include: appointmentIncludes,
    orderBy: { start_at: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = appointments.length > limit;
  const items   = hasMore ? appointments.slice(0, limit) : appointments;

  return { items, nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore };
}

export async function getCalendarView(clinicId: string, date: string) {
  const { start, end } = dayBounds(date);

  return prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      start_at: { gte: start, lte: end },
    },
    include: appointmentIncludes,
    orderBy: { start_at: 'asc' },
  });
}

export async function getAppointment(id: string, clinicId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id, clinic_id: clinicId },
    include: {
      pet: {
        include: {
          owner: {
            select: { id: true, first_name: true, last_name: true, phone: true, email: true },
          },
          allergies: { orderBy: { noted_at: 'desc' }, take: 10 },
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
      room: true,
      medical_record: { select: { id: true } },
      invoice: { select: { id: true, status: true, total: true } },
    },
  });

  if (!appt) throw new AppError('NOT_FOUND', 'Appointment not found', 404);
  return appt;
}

export async function createAppointment(clinicId: string, data: CreateAppointmentInput) {
  const pet = await prisma.pet.findFirst({
    where: { id: data.pet_id, deleted_at: null, owner: { clinic_id: clinicId } },
    select: { id: true },
  });
  if (!pet) throw new AppError('NOT_FOUND', 'Pet not found in this clinic', 404);

  const vet = await prisma.staffUser.findFirst({
    where: { id: data.vet_id, clinic_id: clinicId, is_active: true },
    select: { id: true },
  });
  if (!vet) throw new AppError('NOT_FOUND', 'Veterinarian not found in this clinic', 404);

  const startAt = new Date(data.start_at);
  const endAt   = new Date(data.end_at);

  await assertNoConflict(data.vet_id, startAt, endAt);

  return prisma.appointment.create({
    data: {
      clinic_id:  clinicId,
      pet_id:     data.pet_id,
      vet_id:     data.vet_id,
      type:       data.type,
      start_at:   startAt,
      end_at:     endAt,
      is_walk_in: data.is_walk_in ?? false,
      ...(data.room_id !== undefined && { room_id: data.room_id }),
      ...(data.reason  !== undefined && { reason: data.reason }),
      ...(data.notes   !== undefined && { notes: data.notes }),
    },
    include: appointmentIncludes,
  });
}

export async function updateAppointment(
  id: string,
  clinicId: string,
  data: UpdateAppointmentInput,
) {
  const existing = await prisma.appointment.findFirst({
    where: { id, clinic_id: clinicId },
  });
  if (!existing) throw new AppError('NOT_FOUND', 'Appointment not found', 404);

  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existing.status)) {
    throw new AppError('BAD_REQUEST', 'Cannot update a completed or cancelled appointment', 400);
  }

  if (data.vet_id || data.start_at || data.end_at) {
    const newVetId  = data.vet_id  ?? existing.vet_id;
    const newStart  = data.start_at ? new Date(data.start_at) : existing.start_at;
    const newEnd    = data.end_at   ? new Date(data.end_at)   : existing.end_at;
    await assertNoConflict(newVetId, newStart, newEnd, id);
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      ...(data.vet_id     !== undefined && { vet_id: data.vet_id }),
      ...(data.room_id    !== undefined && { room_id: data.room_id }),
      ...(data.type       !== undefined && { type: data.type }),
      ...(data.start_at   !== undefined && { start_at: new Date(data.start_at) }),
      ...(data.end_at     !== undefined && { end_at: new Date(data.end_at) }),
      ...(data.reason     !== undefined && { reason: data.reason }),
      ...(data.notes      !== undefined && { notes: data.notes }),
      ...(data.is_walk_in !== undefined && { is_walk_in: data.is_walk_in }),
    },
    include: appointmentIncludes,
  });
}

export async function updateStatus(
  id: string,
  clinicId: string,
  data: UpdateAppointmentStatusInput,
) {
  const existing = await prisma.appointment.findFirst({
    where: { id, clinic_id: clinicId },
    select: { id: true, status: true },
  });
  if (!existing) throw new AppError('NOT_FOUND', 'Appointment not found', 404);

  return prisma.appointment.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.status === 'CANCELLED' && {
        cancelled_at:  new Date(),
        cancel_reason: data.cancel_reason ?? null,
      }),
    },
    select: { id: true, status: true, cancelled_at: true, cancel_reason: true },
  });
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function listRooms(clinicId: string) {
  return prisma.room.findMany({
    where: { clinic_id: clinicId, is_active: true },
    orderBy: { name: 'asc' },
  });
}

export async function createRoom(clinicId: string, data: CreateRoomInput) {
  return prisma.room.create({
    data: { clinic_id: clinicId, name: data.name, type: data.type },
  });
}

// ─── Vets (for dropdowns) ─────────────────────────────────────────────────────

export async function listVets(clinicId: string) {
  return prisma.staffUser.findMany({
    where: {
      clinic_id: clinicId,
      is_active: true,
      deleted_at: null,
      role: { in: ['VETERINARIAN', 'ADMIN'] },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      role: true,
      specialization: true,
      avatar_url: true,
    },
    orderBy: { first_name: 'asc' },
  });
}
