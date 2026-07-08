import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type { CreatePetInput, UpdatePetInput, PetQueryInput, CreateAllergyInput } from '@pawcare/shared';

const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

export async function listPets(clinicId: string, query: PetQueryInput) {
  const { search, owner_id, species, status, cursor, limit } = query;

  const pets = await prisma.pet.findMany({
    where: {
      deleted_at: null,
      owner: { clinic_id: clinicId, deleted_at: null },
      ...(owner_id ? { owner_id } : {}),
      ...(species  ? { species }  : {}),
      ...(status   ? { status }   : {}),
      ...(search   ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    },
    include: {
      owner: { select: { id: true, first_name: true, last_name: true } },
      _count: {
        select: {
          appointments: { where: { status: 'COMPLETED' } },
          allergies: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = pets.length > limit;
  const items = hasMore ? pets.slice(0, limit) : pets;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
    hasMore,
  };
}

export async function getPet(id: string, clinicId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id,
      deleted_at: null,
      owner: { clinic_id: clinicId, deleted_at: null },
    },
    include: {
      owner:        { select: { id: true, first_name: true, last_name: true, phone: true, email: true } },
      allergies:    { orderBy: { noted_at: 'desc' } },
      vaccinations: { orderBy: { administered_at: 'desc' } },
      prescriptions: {
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!pet) {
    throw new AppError('NOT_FOUND', 'Pet not found', 404);
  }

  return pet;
}

export async function getPetHistory(id: string, clinicId: string) {
  const pet = await prisma.pet.findFirst({
    where: { id, deleted_at: null, owner: { clinic_id: clinicId } },
    select: { id: true },
  });

  if (!pet) {
    throw new AppError('NOT_FOUND', 'Pet not found', 404);
  }

  const [records, vitals] = await Promise.all([
    prisma.medicalRecord.findMany({
      where: { pet_id: id },
      include: {
        soap_note:   true,
        vitals:      true,
        diagnoses:   true,
        lab_results: true,
      },
      orderBy: { visit_date: 'desc' },
    }),
    prisma.vitals.findMany({
      where: { medical_record: { pet_id: id } },
      orderBy: { recorded_at: 'asc' },
      select: { weight_kg: true, recorded_at: true },
    }),
  ]);

  return { records, weightTrend: vitals };
}

export async function createPet(clinicId: string, data: CreatePetInput) {
  const owner = await prisma.owner.findFirst({
    where: { id: data.owner_id, clinic_id: clinicId, deleted_at: null },
  });

  if (!owner) {
    throw new AppError('NOT_FOUND', 'Owner not found or does not belong to this clinic', 404);
  }

  return prisma.pet.create({
    data: {
      owner_id:      data.owner_id,
      name:          data.name,
      species:       data.species,
      date_of_birth: data.date_of_birth ? new Date(`${data.date_of_birth}T00:00:00Z`) : null,
      weight_kg:     data.weight_kg !== undefined ? new Decimal(data.weight_kg) : null,
      ...(data.breed        !== undefined && { breed: data.breed }),
      ...(data.sex          !== undefined && { sex: data.sex }),
      ...(data.color        !== undefined && { color: data.color }),
      ...(data.insurance_id !== undefined && { insurance_id: data.insurance_id }),
      ...(data.notes        !== undefined && { notes: data.notes }),
    },
  });
}

export async function updatePet(id: string, clinicId: string, data: UpdatePetInput) {
  const pet = await prisma.pet.findFirst({
    where: { id, deleted_at: null, owner: { clinic_id: clinicId } },
  });

  if (!pet) {
    throw new AppError('NOT_FOUND', 'Pet not found', 404);
  }

  return prisma.pet.update({
    where: { id },
    data: {
      ...(data.name          !== undefined && { name: data.name }),
      ...(data.species       !== undefined && { species: data.species }),
      ...(data.breed         !== undefined && { breed: data.breed }),
      ...(data.date_of_birth !== undefined && {
        date_of_birth: data.date_of_birth ? new Date(`${data.date_of_birth}T00:00:00Z`) : null,
      }),
      ...(data.weight_kg !== undefined && {
        weight_kg: data.weight_kg !== undefined && data.weight_kg !== null
          ? new Decimal(data.weight_kg)
          : null,
      }),
      ...(data.sex          !== undefined && { sex: data.sex }),
      ...(data.color        !== undefined && { color: data.color }),
      ...(data.insurance_id !== undefined && { insurance_id: data.insurance_id }),
      ...(data.notes        !== undefined && { notes: data.notes }),
      ...(data.status       !== undefined && { status: data.status }),
    },
  });
}

export async function addAllergy(petId: string, clinicId: string, data: CreateAllergyInput) {
  const pet = await prisma.pet.findFirst({
    where: { id: petId, deleted_at: null, owner: { clinic_id: clinicId } },
  });

  if (!pet) {
    throw new AppError('NOT_FOUND', 'Pet not found', 404);
  }

  return prisma.allergy.create({
    data: {
      pet_id:   petId,
      allergen: data.allergen,
      ...(data.reaction !== undefined && { reaction: data.reaction }),
      ...(data.severity !== undefined && { severity: data.severity }),
    },
  });
}
