export type Species = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'REPTILE' | 'SMALL_MAMMAL' | 'OTHER';
export type PetStatus = 'ACTIVE' | 'DECEASED' | 'TRANSFERRED' | 'INACTIVE';
export type PetSex = 'M' | 'F' | 'M_NEUTERED' | 'F_SPAYED';
export type PreferredContact = 'email' | 'sms' | 'phone';

export interface Owner {
  id:                string;
  clinic_id:         string;
  email:             string | null;
  first_name:        string;
  last_name:         string;
  phone:             string;
  address:           string | null;
  emergency_contact: string | null;
  preferred_contact: PreferredContact;
  portal_enabled:    boolean;
  created_at:        string;
  updated_at:        string;
  deleted_at:        string | null;
  pets?:             Pet[];
  _count?:           { pets: number };
}

export interface Pet {
  id:            string;
  owner_id:      string;
  name:          string;
  species:       Species;
  breed:         string | null;
  date_of_birth: string | null;
  weight_kg:     string | null;
  sex:           PetSex | null;
  color:         string | null;
  microchip_id:  string | null;
  photo_url:     string | null;
  insurance_id:  string | null;
  status:        PetStatus;
  notes:         string | null;
  created_at:    string;
  updated_at:    string;
  deleted_at:    string | null;
  owner?:        Pick<Owner, 'id' | 'first_name' | 'last_name' | 'phone' | 'email'>;
  allergies?:    Allergy[];
  vaccinations?: Vaccination[];
  prescriptions?: Prescription[];
  _count?:       { appointments: number; allergies: number };
}

export interface Allergy {
  id:       string;
  pet_id:   string;
  allergen: string;
  reaction: string | null;
  severity: 'mild' | 'moderate' | 'severe' | null;
  noted_at: string;
}

export interface Vaccination {
  id:               string;
  pet_id:           string;
  vaccine_name:     string;
  manufacturer:     string | null;
  lot_number:       string | null;
  administered_at:  string;
  next_due_at:      string | null;
  administered_by:  string;
  notes:            string | null;
  created_at:       string;
}

export interface Prescription {
  id:                string;
  drug_name:         string;
  dosage:            string;
  frequency:         string;
  duration_days:     number | null;
  quantity:          number | null;
  refills_remaining: number;
  instructions:      string | null;
  is_active:         boolean;
  expires_at:        string | null;
  created_at:        string;
}

export interface PaginatedResponse<T> {
  items:      T[];
  nextCursor: string | null;
  hasMore:    boolean;
}
