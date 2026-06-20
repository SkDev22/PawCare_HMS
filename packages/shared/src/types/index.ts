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
  avatar_url?: string;
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
