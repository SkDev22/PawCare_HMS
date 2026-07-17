import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  Appointment,
  AppointmentDetail,
  PaginatedAppointments,
  Room,
  VetSummary,
} from '@/types/appointments';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from '@pawcare/shared';

type ApiError = { response?: { data?: { error?: { message?: string } } } };

function errMsg(err: ApiError, fallback: string) {
  return err?.response?.data?.error?.message ?? fallback;
}

// ─── Calendar & List ──────────────────────────────────────────────────────────

export function useCalendarView(date: string) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', 'calendar', date],
    queryFn: () => api.get('/appointments/calendar', { params: { date } }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useAppointments(params?: {
  date?: string;
  status?: string;
  vet_id?: string;
  pet_id?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery<PaginatedAppointments>({
    queryKey: ['appointments', 'list', params],
    queryFn: () => api.get('/appointments', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery<AppointmentDetail>({
    queryKey: ['appointments', id],
    queryFn: () => api.get(`/appointments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useQueue(date: string) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', 'queue', date],
    queryFn: () => api.get('/appointments/queue', { params: { date } }).then((r) => r.data),
    refetchInterval: 15_000,
  });
}

// ─── Vets & Rooms dropdowns ───────────────────────────────────────────────────

export function useVets() {
  return useQuery<VetSummary[]>({
    queryKey: ['appointments', 'vets'],
    queryFn: () => api.get('/appointments/vets').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ['appointments', 'rooms'],
    queryFn: () => api.get('/appointments/rooms').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api.post('/appointments/rooms', data).then((r) => r.data as Room),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'rooms'] });
      toast.success('Room added');
    },
    onError: (err: ApiError) => toast.error(errMsg(err, 'Failed to add room')),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      api.post('/appointments', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment scheduled');
    },
    onError: (err: ApiError) => {
      toast.error(errMsg(err, 'Failed to schedule appointment'));
    },
  });
}

export function useUpdateAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAppointmentInput) =>
      api.put(`/appointments/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated');
    },
    onError: (err: ApiError) => {
      toast.error(errMsg(err, 'Failed to update appointment'));
    },
  });
}

export function useUpdateAppointmentStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAppointmentStatusInput) =>
      api.patch(`/appointments/${id}/status`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      const label: Record<string, string> = {
        CONFIRMED:   'Appointment confirmed',
        CHECKED_IN:  'Patient checked in',
        IN_PROGRESS: 'Visit started',
        COMPLETED:   'Visit completed',
        CANCELLED:   'Appointment cancelled',
        NO_SHOW:     'Marked as no-show',
      };
      toast.success(label[variables.status] ?? 'Status updated');
    },
    onError: (err: ApiError) => {
      toast.error(errMsg(err, 'Failed to update status'));
    },
  });
}
