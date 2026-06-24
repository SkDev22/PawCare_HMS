import type { Pet, Owner } from './patients';

export type AppointmentType =
  | 'WELLNESS_EXAM'
  | 'VACCINATION'
  | 'SICK_VISIT'
  | 'SURGERY'
  | 'DENTAL'
  | 'FOLLOW_UP'
  | 'EMERGENCY'
  | 'GROOMING'
  | 'LAB_ONLY';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Room {
  id:         string;
  clinic_id:  string;
  name:       string;
  type:       string;
  is_active:  boolean;
  created_at: string;
  updated_at: string;
}

export interface VetSummary {
  id:             string;
  first_name:     string;
  last_name:      string;
  role:           string;
  specialization: string | null;
  avatar_url:     string | null;
}

export interface AppointmentPetSummary {
  id:      string;
  name:    string;
  species: string;
  breed:   string | null;
  owner:   Pick<Owner, 'id' | 'first_name' | 'last_name' | 'phone'>;
}

export interface Appointment {
  id:            string;
  clinic_id:     string;
  pet_id:        string;
  vet_id:        string;
  room_id:       string | null;
  type:          AppointmentType;
  status:        AppointmentStatus;
  start_at:      string;
  end_at:        string;
  reason:        string | null;
  notes:         string | null;
  is_walk_in:    boolean;
  cancelled_at:  string | null;
  cancel_reason: string | null;
  created_at:    string;
  updated_at:    string;
  pet:           AppointmentPetSummary;
  vet:           VetSummary;
  room:          Pick<Room, 'id' | 'name' | 'type'> | null;
}

export interface AppointmentDetail extends Appointment {
  pet: AppointmentPetSummary & {
    allergies: Array<{ id: string; allergen: string; severity: string | null }>;
    owner: Pick<Owner, 'id' | 'first_name' | 'last_name' | 'phone' | 'email'>;
  };
  room:           Room | null;
  medical_record: { id: string } | null;
  invoice:        { id: string; status: string; total: string } | null;
}

export interface PaginatedAppointments {
  items:      Appointment[];
  nextCursor: string | null;
  hasMore:    boolean;
}
