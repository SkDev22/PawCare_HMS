export type StaffRole =
  | 'ADMIN'
  | 'VETERINARIAN'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECHNICIAN';

export type StaffScheduleEntry = {
  id:          string;
  staff_id:    string;
  day_of_week: number;
  start_time:  string;
  end_time:    string;
  is_active:   boolean;
};

export type StaffListItem = {
  id:             string;
  clinic_id:      string;
  email:          string;
  first_name:     string;
  last_name:      string;
  role:           StaffRole;
  specialization: string | null;
  license_number: string | null;
  phone:          string | null;
  avatar_url:     string | null;
  is_active:      boolean;
  last_login_at:  string | null;
  created_at:     string;
  updated_at:     string;
  deleted_at:     string | null;
  _count:         { appointments: number };
};

export type StaffMember = StaffListItem & {
  schedules: StaffScheduleEntry[];
  _count: { appointments: number; medical_records: number };
};

export type PaginatedStaff = {
  items:      StaffListItem[];
  nextCursor: string | null;
  hasMore:    boolean;
};
