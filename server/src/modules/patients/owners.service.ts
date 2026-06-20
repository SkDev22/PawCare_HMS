import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type { CreateOwnerInput, UpdateOwnerInput, OwnerQueryInput } from '@pawcare/shared';

export async function listOwners(clinicId: string, query: OwnerQueryInput) {
  const { search, cursor, limit } = query;

  const where = {
    clinic_id: clinicId,
    deleted_at: null,
    ...(search
      ? {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' as const } },
            { last_name:  { contains: search, mode: 'insensitive' as const } },
            { email:      { contains: search, mode: 'insensitive' as const } },
            { phone:      { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const owners = await prisma.owner.findMany({
    where,
    include: { _count: { select: { pets: { where: { deleted_at: null } } } } },
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = owners.length > limit;
  const items = hasMore ? owners.slice(0, limit) : owners;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
    hasMore,
  };
}

export async function getOwner(id: string, clinicId: string) {
  const owner = await prisma.owner.findFirst({
    where: { id, clinic_id: clinicId, deleted_at: null },
    include: {
      pets: {
        where: { deleted_at: null },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!owner) {
    throw new AppError('NOT_FOUND', 'Owner not found', 404);
  }

  return owner;
}

export async function createOwner(clinicId: string, data: CreateOwnerInput) {
  if (data.email) {
    const existing = await prisma.owner.findFirst({
      where: { email: data.email, deleted_at: null },
    });
    if (existing) {
      throw new AppError('CONFLICT', 'An owner with this email already exists', 409);
    }
  }

  return prisma.owner.create({
    data: {
      clinic_id: clinicId,
      first_name: data.first_name,
      last_name:  data.last_name,
      email:      data.email || null,
      phone:      data.phone,
      ...(data.address           !== undefined && { address: data.address }),
      ...(data.emergency_contact !== undefined && { emergency_contact: data.emergency_contact }),
      preferred_contact: data.preferred_contact ?? 'email',
      portal_enabled:    data.portal_enabled ?? false,
    },
  });
}

export async function updateOwner(id: string, clinicId: string, data: UpdateOwnerInput) {
  const owner = await prisma.owner.findFirst({
    where: { id, clinic_id: clinicId, deleted_at: null },
  });

  if (!owner) {
    throw new AppError('NOT_FOUND', 'Owner not found', 404);
  }

  if (data.email && data.email !== owner.email) {
    const conflict = await prisma.owner.findFirst({
      where: { email: data.email, deleted_at: null, NOT: { id } },
    });
    if (conflict) {
      throw new AppError('CONFLICT', 'An owner with this email already exists', 409);
    }
  }

  return prisma.owner.update({
    where: { id },
    data: {
      ...(data.first_name !== undefined  && { first_name: data.first_name }),
      ...(data.last_name  !== undefined  && { last_name: data.last_name }),
      ...(data.email      !== undefined  && { email: data.email || null }),
      ...(data.phone      !== undefined  && { phone: data.phone }),
      ...(data.address    !== undefined  && { address: data.address }),
      ...(data.emergency_contact !== undefined && { emergency_contact: data.emergency_contact }),
      ...(data.preferred_contact !== undefined && { preferred_contact: data.preferred_contact }),
      ...(data.portal_enabled    !== undefined && { portal_enabled: data.portal_enabled }),
    },
  });
}

export async function deleteOwner(id: string, clinicId: string) {
  const owner = await prisma.owner.findFirst({
    where: { id, clinic_id: clinicId, deleted_at: null },
  });

  if (!owner) {
    throw new AppError('NOT_FOUND', 'Owner not found', 404);
  }

  await prisma.owner.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
}
