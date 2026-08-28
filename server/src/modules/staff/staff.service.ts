import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { notifyStaff } from '../notifications/notifications.service';
import { getSeatLimit } from '@pawcare/shared';
import type {
  CreateStaffInput,
  UpdateStaffInput,
  UpdateOwnProfileInput,
  StaffQueryInput,
  UpsertScheduleInput,
} from '@pawcare/shared';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SAFE_FIELDS = {
  id:             true,
  clinic_id:      true,
  email:          true,
  first_name:     true,
  last_name:      true,
  role:           true,
  specialization: true,
  license_number: true,
  phone:          true,
  avatar_url:     true,
  is_active:      true,
  last_login_at:  true,
  created_at:     true,
  updated_at:     true,
  deleted_at:     true,
} as const;

const staffListIncludes = {
  _count: {
    select: { appointments: true },
  },
} as const;

const staffDetailIncludes = {
  schedules: {
    where:   { is_active: true },
    orderBy: { day_of_week: 'asc' as const },
    select: {
      id:          true,
      day_of_week: true,
      start_time:  true,
      end_time:    true,
      is_active:   true,
    },
  },
  _count: {
    select: { appointments: true, medical_records: true },
  },
} as const;

async function assertStaff(id: string, clinicId: string) {
  const staff = await prisma.staffUser.findFirst({
    where: { id, clinic_id: clinicId, deleted_at: null },
    select: { id: true, role: true, is_active: true },
  });
  if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found', 404);
  return staff;
}

async function countActiveAdmins(clinicId: string, excludeId?: string) {
  return prisma.staffUser.count({
    where: {
      clinic_id:  clinicId,
      role:       'ADMIN',
      is_active:  true,
      deleted_at: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

// Called wherever an action would increase the clinic's active-staff count
// (creating a new staff member, or reactivating a deactivated one) — not on
// plain profile edits or on deactivation itself. Reads the plan fresh from
// the DB rather than trusting the JWT's (up to ~15-minute-stale) claim,
// since this is an actual business limit being enforced, not a cosmetic gate.
async function assertSeatAvailable(clinicId: string) {
  const clinic = await prisma.clinic.findUnique({
    where:  { id: clinicId },
    select: { plan: true, seat_limit_override: true },
  });
  if (!clinic) throw new AppError('NOT_FOUND', 'Clinic not found', 404);

  const limit = getSeatLimit(clinic.plan, clinic.seat_limit_override);
  if (limit === null) return;

  const activeCount = await prisma.staffUser.count({
    where: { clinic_id: clinicId, is_active: true, deleted_at: null },
  });
  if (activeCount >= limit) {
    throw new AppError(
      'SEAT_LIMIT_REACHED',
      `Your ${clinic.plan} plan includes up to ${limit} staff seats, and all are in use. Deactivate a staff member or upgrade your plan to add more.`,
      403,
    );
  }
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listStaff(clinicId: string, params: StaffQueryInput) {
  const { role, search, is_active, cursor, limit } = params;

  const where = {
    clinic_id:  clinicId,
    deleted_at: null,
    ...(role      ? { role }                                                                              : {}),
    ...(is_active !== undefined ? { is_active }                                                          : {}),
    ...(search ? {
      OR: [
        { first_name:     { contains: search, mode: 'insensitive' as const } },
        { last_name:      { contains: search, mode: 'insensitive' as const } },
        { email:          { contains: search, mode: 'insensitive' as const } },
        { specialization: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(cursor ? { id: { gt: cursor } } : {}),
  };

  const items = await prisma.staffUser.findMany({
    where,
    select: { ...SAFE_FIELDS, ...staffListIncludes },
    orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const result  = hasMore ? items.slice(0, limit) : items;

  return {
    items:      result,
    nextCursor: hasMore ? result[result.length - 1].id : null,
    hasMore,
  };
}

export async function getStaff(id: string, clinicId: string) {
  const staff = await prisma.staffUser.findFirst({
    where:   { id, clinic_id: clinicId, deleted_at: null },
    select:  { ...SAFE_FIELDS, ...staffDetailIncludes },
  });
  if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found', 404);
  return staff;
}

export async function createStaff(clinicId: string, data: CreateStaffInput) {
  await assertSeatAvailable(clinicId);

  const existing = await prisma.staffUser.findFirst({
    where: { email: data.email, deleted_at: null },
    select: { id: true },
  });
  if (existing) throw new AppError('CONFLICT', 'Email address is already in use', 409);

  const password_hash = await bcrypt.hash(data.password, 12);

  const staff = await prisma.staffUser.create({
    data: {
      clinic_id:      clinicId,
      email:          data.email,
      password_hash,
      first_name:     data.first_name,
      last_name:      data.last_name,
      role:           data.role,
      ...(data.specialization ? { specialization: data.specialization } : {}),
      ...(data.license_number ? { license_number: data.license_number } : {}),
      ...(data.phone          ? { phone:          data.phone }          : {}),
    },
    select: { ...SAFE_FIELDS, ...staffDetailIncludes },
  });

  return staff;
}

export async function updateStaff(id: string, clinicId: string, data: UpdateStaffInput) {
  const current = await assertStaff(id, clinicId);

  // Reactivating someone increases the active-staff count just like creating
  // a new one does — enforce the same seat limit here.
  if (data.is_active === true && !current.is_active) {
    await assertSeatAvailable(clinicId);
  }

  // Guard: cannot downgrade the last active admin
  if (data.role && data.role !== 'ADMIN' && current.role === 'ADMIN') {
    const remainingAdmins = await countActiveAdmins(clinicId, id);
    if (remainingAdmins === 0) {
      throw new AppError('CONFLICT', 'Cannot change role: this is the last active admin', 409);
    }
  }

  // Guard: cannot deactivate the last active admin via is_active=false
  if (data.is_active === false && current.role === 'ADMIN') {
    const remainingAdmins = await countActiveAdmins(clinicId, id);
    if (remainingAdmins === 0) {
      throw new AppError('CONFLICT', 'Cannot deactivate the last active admin', 409);
    }
  }

  // Check email uniqueness if changing email
  if (data.email && data.email !== (await prisma.staffUser.findUnique({ where: { id }, select: { email: true } }))?.email) {
    const conflict = await prisma.staffUser.findFirst({
      where: { email: data.email, deleted_at: null },
      select: { id: true },
    });
    if (conflict) throw new AppError('CONFLICT', 'Email address is already in use', 409);
  }

  const updated = await prisma.staffUser.update({
    where: { id },
    data: {
      ...(data.first_name     !== undefined ? { first_name:     data.first_name }     : {}),
      ...(data.last_name      !== undefined ? { last_name:      data.last_name }      : {}),
      ...(data.email          !== undefined ? { email:          data.email }          : {}),
      ...(data.role           !== undefined ? { role:           data.role }           : {}),
      ...(data.specialization !== undefined ? { specialization: data.specialization } : {}),
      ...(data.license_number !== undefined ? { license_number: data.license_number } : {}),
      ...(data.phone          !== undefined ? { phone:          data.phone }          : {}),
      ...(data.avatar_url     !== undefined ? { avatar_url:     data.avatar_url }     : {}),
      ...(data.is_active      !== undefined ? { is_active:      data.is_active }      : {}),
    },
    select: { ...SAFE_FIELDS, ...staffDetailIncludes },
  });

  return updated;
}

// Self-service profile update — any authenticated staff member calling this
// on their own id, restricted to non-privileged fields (no role, email,
// is_active, or avatar_url). No last-admin guards apply since those fields
// aren't editable here.
export async function updateOwnProfile(id: string, data: UpdateOwnProfileInput) {
  const existing = await prisma.staffUser.findFirst({
    where: { id, deleted_at: null },
    select: { id: true },
  });
  if (!existing) throw new AppError('NOT_FOUND', 'Staff account not found', 404);

  return prisma.staffUser.update({
    where: { id },
    data: {
      ...(data.first_name     !== undefined ? { first_name:     data.first_name }     : {}),
      ...(data.last_name      !== undefined ? { last_name:      data.last_name }      : {}),
      ...(data.specialization !== undefined ? { specialization: data.specialization } : {}),
      ...(data.license_number !== undefined ? { license_number: data.license_number } : {}),
      ...(data.phone          !== undefined ? { phone:          data.phone }          : {}),
    },
    select: SAFE_FIELDS,
  });
}

export async function deactivateStaff(id: string, clinicId: string) {
  const current = await assertStaff(id, clinicId);

  if (current.role === 'ADMIN') {
    const remainingAdmins = await countActiveAdmins(clinicId, id);
    if (remainingAdmins === 0) {
      throw new AppError('CONFLICT', 'Cannot deactivate the last active admin', 409);
    }
  }

  await prisma.$transaction([
    // Revoke all active refresh tokens
    prisma.refreshToken.updateMany({
      where: { staff_id: id, revoked_at: null },
      data:  { revoked_at: new Date() },
    }),
    // Soft-delete the staff member
    prisma.staffUser.update({
      where: { id },
      data:  { is_active: false, deleted_at: new Date() },
    }),
  ]);
}

export async function getSchedule(id: string, clinicId: string) {
  await assertStaff(id, clinicId);

  return prisma.staffSchedule.findMany({
    where:   { staff_id: id },
    orderBy: { day_of_week: 'asc' },
    select: {
      id:          true,
      staff_id:    true,
      day_of_week: true,
      start_time:  true,
      end_time:    true,
      is_active:   true,
    },
  });
}

export async function upsertSchedule(
  id: string,
  clinicId: string,
  data: UpsertScheduleInput,
) {
  await assertStaff(id, clinicId);

  const schedules = await prisma.$transaction(async (tx) => {
    await tx.staffSchedule.deleteMany({ where: { staff_id: id } });

    if (data.entries.length === 0) return [];

    await tx.staffSchedule.createMany({
      data: data.entries.map((e) => ({
        staff_id:    id,
        day_of_week: e.day_of_week,
        start_time:  e.start_time,
        end_time:    e.end_time,
        is_active:   e.is_active,
      })),
    });

    await notifyStaff(tx, {
      staff_id: id,
      type:     'schedule_changed',
      subject:  'Schedule Updated',
      body:     'Your weekly schedule has been updated.',
    });

    return tx.staffSchedule.findMany({
      where:   { staff_id: id },
      orderBy: { day_of_week: 'asc' },
      select: {
        id:          true,
        staff_id:    true,
        day_of_week: true,
        start_time:  true,
        end_time:    true,
        is_active:   true,
      },
    });
  });

  return schedules;
}
