import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type {
  StaffMember,
  StaffListItem,
  PaginatedStaff,
  StaffRole,
  StaffScheduleEntry,
} from '../types/staff';

export function useStaffList(params?: {
  role?:      StaffRole;
  search?:    string;
  is_active?: boolean;
  limit?:     number;
}) {
  return useQuery<PaginatedStaff>({
    queryKey: ['staff', params],
    queryFn:  () => api.get('/staff', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useStaffMember(id: string | undefined) {
  return useQuery<StaffMember>({
    queryKey: ['staff', id],
    queryFn:  () => api.get(`/staff/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useStaffSchedule(id: string | undefined) {
  return useQuery<StaffScheduleEntry[]>({
    queryKey: ['staff', id, 'schedule'],
    queryFn:  () => api.get(`/staff/${id}/schedule`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email:          string;
      password:       string;
      first_name:     string;
      last_name:      string;
      role:           StaffRole;
      specialization?: string;
      license_number?: string;
      phone?:          string;
    }) => api.post('/staff', data).then((r) => r.data as StaffMember),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member created');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create staff member');
    },
  });
}

export function useUpdateStaff(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      first_name?:     string;
      last_name?:      string;
      email?:          string;
      role?:           StaffRole;
      specialization?: string;
      license_number?: string;
      phone?:          string;
      is_active?:      boolean;
    }) => api.put(`/staff/${id}`, data).then((r) => r.data as StaffMember),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member updated');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update staff member');
    },
  });
}

export function useDeactivateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member deactivated');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Cannot deactivate staff member');
    },
  });
}

export function useUpsertSchedule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: Array<{
      day_of_week: number;
      start_time:  string;
      end_time:    string;
      is_active:   boolean;
    }>) =>
      api
        .put(`/staff/${id}/schedule`, { entries })
        .then((r) => r.data as StaffScheduleEntry[]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', id] });
      qc.invalidateQueries({ queryKey: ['staff', id, 'schedule'] });
      toast.success('Schedule saved');
    },
    onError: () => toast.error('Failed to save schedule'),
  });
}
