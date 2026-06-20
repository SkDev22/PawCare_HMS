import { z } from 'zod';

// ─── Owner Schemas ────────────────────────────────────────────────────────────

export const CreateOwnerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name:  z.string().min(1, 'Last name is required').max(100),
  email:      z.string().email('Invalid email').optional().or(z.literal('')),
  phone:      z.string().min(7, 'Phone number is required').max(30),
  address:    z.string().max(500).optional(),
  emergency_contact: z.string().max(200).optional(),
  preferred_contact: z.enum(['email', 'sms', 'phone']).default('email'),
  portal_enabled: z.boolean().default(false),
});

export const UpdateOwnerSchema = CreateOwnerSchema.partial();

export const OwnerQuerySchema = z.object({
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Pet Schemas ──────────────────────────────────────────────────────────────

export const PetSexEnum = z.enum(['M', 'F', 'M_NEUTERED', 'F_SPAYED']);
export const SpeciesEnum = z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'REPTILE', 'SMALL_MAMMAL', 'OTHER']);
export const PetStatusEnum = z.enum(['ACTIVE', 'DECEASED', 'TRANSFERRED', 'INACTIVE']);

export const CreatePetSchema = z.object({
  owner_id:       z.string().uuid('Invalid owner ID'),
  name:           z.string().min(1, 'Pet name is required').max(100),
  species:        SpeciesEnum,
  breed:          z.string().max(100).optional(),
  date_of_birth:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional().or(z.literal('')),
  weight_kg:      z.coerce.number().positive().max(999).optional(),
  sex:            PetSexEnum.optional(),
  color:          z.string().max(100).optional(),
  microchip_id:   z.string().max(50).optional(),
  insurance_id:   z.string().max(100).optional(),
  notes:          z.string().max(2000).optional(),
});

export const UpdatePetSchema = CreatePetSchema.omit({ owner_id: true }).partial().extend({
  status: PetStatusEnum.optional(),
});

export const PetQuerySchema = z.object({
  owner_id: z.string().uuid().optional(),
  species:  SpeciesEnum.optional(),
  status:   PetStatusEnum.optional(),
  cursor:   z.string().uuid().optional(),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Allergy Schema ───────────────────────────────────────────────────────────

export const CreateAllergySchema = z.object({
  allergen: z.string().min(1, 'Allergen is required').max(200),
  reaction: z.string().max(500).optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
});

export type CreateOwnerInput    = z.infer<typeof CreateOwnerSchema>;
export type UpdateOwnerInput    = z.infer<typeof UpdateOwnerSchema>;
export type OwnerQueryInput     = z.infer<typeof OwnerQuerySchema>;
export type CreatePetInput      = z.infer<typeof CreatePetSchema>;
export type UpdatePetInput      = z.infer<typeof UpdatePetSchema>;
export type PetQueryInput       = z.infer<typeof PetQuerySchema>;
export type CreateAllergyInput  = z.infer<typeof CreateAllergySchema>;
