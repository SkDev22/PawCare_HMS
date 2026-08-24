import type { ClinicPlanType } from '../constants/features';

export type StaffRole =
  | 'ADMIN'
  | 'VETERINARIAN'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECHNICIAN';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  clinic_id: string;
  plan: ClinicPlanType;
  trial_ends_at: string | null;
  extra_features: string[];
  avatar_url?: string;
  phone?: string;
  specialization?: string;
  license_number?: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
