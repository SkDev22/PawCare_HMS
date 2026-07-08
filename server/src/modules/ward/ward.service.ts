import { Prisma, KennelStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type {
  AdmitPetInput,
  DischargePetInput,
  AddCareLogInput,
  HospitalizationQuery,
  CreateKennelInput,
} from '@pawcare/shared';

// ── Kennel helpers ──────────────────────────────────────────────────────────

const KENNEL_SELECT = {
  id:      true,
  label:   true,
  size:    true,
  status:  true,
  notes:   true,
  room:    { select: { id: true, name: true, clinic_id: true } },
} as const;

export async function listKennels(clinicId: string, status?: KennelStatus) {
  const kennels = await prisma.kennelUnit.findMany({
    where:   { room: { clinic_id: clinicId }, ...(status ? { status } : {}) },
    select:  KENNEL_SELECT,
    orderBy: [{ room: { name: 'asc' } }, { label: 'asc' }],
  });

  // Attach active hospitalization to occupied kennels
  const occupiedIds = kennels.filter((k) => k.status === 'OCCUPIED').map((k) => k.id);
  const activeHosps =
    occupiedIds.length > 0
      ? await prisma.hospitalization.findMany({
          where: {
            kennel_id:    { in: occupiedIds },
            discharged_at: null,
          },
          select: {
            id:          true,
            kennel_id:   true,
            reason:      true,
            admitted_at: true,
            estimated_stay_days: true,
            pet: {
              select: { id: true, name: true, species: true, breed: true },
            },
          },
        })
      : [];

  const hospByKennel = new Map(activeHosps.map((h) => [h.kennel_id, h]));

  return kennels.map((k) => ({
    ...k,
    active_hospitalization: hospByKennel.get(k.id) ?? null,
  }));
}

export async function createKennel(clinicId: string, data: CreateKennelInput) {
  const room = await prisma.room.findFirst({
    where: { id: data.room_id, clinic_id: clinicId },
  });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

  const kennel = await prisma.kennelUnit.create({
    data: {
      room_id: data.room_id,
      label:   data.label,
      size:    data.size,
      ...(data.notes ? { notes: data.notes } : {}),
    },
    select: KENNEL_SELECT,
  });

  return { ...kennel, active_hospitalization: null };
}

export async function updateKennelStatus(id: string, clinicId: string, status: KennelStatus) {
  const kennel = await prisma.kennelUnit.findFirst({
    where: { id, room: { clinic_id: clinicId } },
  });
  if (!kennel) throw Object.assign(new Error('Kennel not found'), { status: 404 });
  if (kennel.status === 'OCCUPIED') {
    throw Object.assign(
      new Error("Discharge the patient before changing this kennel's status"),
      { status: 409 },
    );
  }

  const updated = await prisma.kennelUnit.update({
    where:  { id },
    data:   { status },
    select: KENNEL_SELECT,
  });
  return { ...updated, active_hospitalization: null };
}

// ── Hospitalization helpers ─────────────────────────────────────────────────

const HOSP_INCLUDE = {
  pet: {
    select: {
      id:      true,
      name:    true,
      species: true,
      breed:   true,
      owner:   { select: { id: true, first_name: true, last_name: true, phone: true } },
    },
  },
  kennel: {
    select: {
      id:    true,
      label: true,
      size:  true,
      room:  { select: { id: true, name: true } },
    },
  },
  care_logs: {
    orderBy: { logged_at: 'desc' as const },
  },
} as const;

function clinicScope(clinicId: string) {
  return { pet: { owner: { clinic_id: clinicId } } };
}

export async function listHospitalizations(clinicId: string, params: HospitalizationQuery) {
  const where: Prisma.HospitalizationWhereInput = {
    ...clinicScope(clinicId),
    ...(params.active_only ? { discharged_at: null } : {}),
    ...(params.pet_id ? { pet_id: params.pet_id } : {}),
    ...(params.cursor ? { id: { lt: params.cursor } } : {}),
  };

  const limit = params.limit;
  const rows = await prisma.hospitalization.findMany({
    where,
    include: {
      pet: {
        select: {
          id: true, name: true, species: true, breed: true,
          owner: { select: { id: true, first_name: true, last_name: true } },
        },
      },
      kennel: {
        select: { id: true, label: true, size: true, room: { select: { name: true } } },
      },
    },
    orderBy: { admitted_at: 'desc' },
    take:    limit + 1,
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getHospitalization(id: string, clinicId: string) {
  const hosp = await prisma.hospitalization.findFirst({
    where:   { id, ...clinicScope(clinicId) },
    include: HOSP_INCLUDE,
  });
  if (!hosp) return null;

  // Fetch admitted_by staff separately (no declared relation)
  const admittedByStaff = await prisma.staffUser.findUnique({
    where:  { id: hosp.admitted_by },
    select: { id: true, first_name: true, last_name: true, role: true },
  });

  // Fetch performed_by for each care log
  const performerIds = [...new Set(hosp.care_logs.map((l) => l.performed_by))];
  const performers =
    performerIds.length > 0
      ? await prisma.staffUser.findMany({
          where:  { id: { in: performerIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
  const perfMap = new Map(performers.map((p) => [p.id, p]));

  return {
    ...hosp,
    admitted_by_staff: admittedByStaff,
    care_logs: hosp.care_logs.map((log) => ({
      ...log,
      performed_by_staff: perfMap.get(log.performed_by) ?? null,
    })),
  };
}

export async function admitPet(clinicId: string, staffId: string, data: AdmitPetInput) {
  // Verify kennel belongs to this clinic
  const kennel = await prisma.kennelUnit.findFirst({
    where: { id: data.kennel_id, room: { clinic_id: clinicId } },
  });
  if (!kennel) throw Object.assign(new Error('Kennel not found'), { status: 404 });
  if (kennel.status !== 'AVAILABLE') {
    throw Object.assign(new Error('Kennel is not available'), { status: 409 });
  }

  // Verify pet belongs to this clinic
  const pet = await prisma.pet.findFirst({
    where: { id: data.pet_id, owner: { clinic_id: clinicId }, deleted_at: null },
  });
  if (!pet) throw Object.assign(new Error('Patient not found'), { status: 404 });

  return prisma.$transaction(async (tx) => {
    const hosp = await tx.hospitalization.create({
      data: {
        pet_id:      data.pet_id,
        kennel_id:   data.kennel_id,
        admitted_by: staffId,
        reason:      data.reason,
        ...(data.estimated_stay_days ? { estimated_stay_days: data.estimated_stay_days } : {}),
      },
      include: {
        pet:    { select: { id: true, name: true, species: true } },
        kennel: { select: { id: true, label: true } },
      },
    });
    await tx.kennelUnit.update({ where: { id: data.kennel_id }, data: { status: 'OCCUPIED' } });
    return hosp;
  });
}

export async function discharge(id: string, clinicId: string, data: DischargePetInput) {
  const hosp = await prisma.hospitalization.findFirst({
    where: { id, ...clinicScope(clinicId) },
  });
  if (!hosp) throw Object.assign(new Error('Hospitalization not found'), { status: 404 });
  if (hosp.discharged_at) throw Object.assign(new Error('Already discharged'), { status: 409 });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.hospitalization.update({
      where: { id },
      data: {
        discharged_at:  new Date(),
        ...(data.discharge_notes ? { discharge_notes: data.discharge_notes } : {}),
      },
      include: { kennel: { select: { id: true, label: true } } },
    });
    // Discharge doesn't return the kennel straight to service — it needs
    // cleaning before the next patient can be admitted.
    await tx.kennelUnit.update({ where: { id: hosp.kennel_id }, data: { status: 'CLEANING' } });
    return updated;
  });
}

export async function addCareLog(
  hospId:    string,
  clinicId:  string,
  staffId:   string,
  data:      AddCareLogInput,
) {
  const hosp = await prisma.hospitalization.findFirst({
    where: { id: hospId, ...clinicScope(clinicId) },
  });
  if (!hosp) throw Object.assign(new Error('Hospitalization not found'), { status: 404 });
  if (hosp.discharged_at) throw Object.assign(new Error('Patient already discharged'), { status: 409 });

  return prisma.careLog.create({
    data: {
      hospitalization_id: hospId,
      performed_by:       staffId,
      type:               data.type,
      notes:              data.notes,
    },
  });
}
