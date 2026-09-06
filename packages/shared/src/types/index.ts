import type { ClinicPlanType } from '../constants/features';
import type { PermissionKey } from '../constants/permissions';

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
  clinic_name: string;
  plan: ClinicPlanType;
  trial_ends_at: string | null;
  extra_features: string[];
  // Resolved server-side per-clinic override merge (see
  // server/src/lib/role-permissions.ts) — deliberately not embedded in the
  // signed JWT like plan/extra_features, so it can be pushed live via the
  // permissions:updated socket event without waiting on a token refresh.
  effective_permissions: PermissionKey[];
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
