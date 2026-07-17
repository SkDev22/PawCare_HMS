import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type {
  KennelUnit,
  Hospitalization,
  HospitalizationListItem,
  PaginatedHospitalizations,
} from '../types/ward';

export function useKennels() {
  return useQuery<KennelUnit[]>({
    queryKey: ['kennels'],
    queryFn:  () => api.get('/ward/kennels').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useCreateKennel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      room_id: string;
      label:   string;
      size:    string;
      notes?:  string;
    }) => api.post('/ward/kennels', data).then((r) => r.data as KennelUnit),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kennels'] });
      toast.success('Kennel added');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to add kennel');
    },
  });
}

export function useUpdateKennelStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/ward/kennels/${id}/status`, { status }).then((r) => r.data as KennelUnit),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kennels'] });
      toast.success('Kennel status updated');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update kennel status');
    },
  });
}

export function useHospitalizations(params?: {
  active_only?: boolean;
  pet_id?:      string;
  limit?:       number;
}) {
  return useQuery<PaginatedHospitalizations>({
    queryKey: ['hospitalizations', params],
    queryFn:  () => api.get('/ward/hospitalizations', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useHospitalization(id: string | undefined) {
  return useQuery<Hospitalization>({
    queryKey: ['hospitalizations', id],
    queryFn:  () => api.get(`/ward/hospitalizations/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useAdmitPet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      pet_id:               string;
      kennel_id:            string;
      reason:               string;
      estimated_stay_days?: number;
    }) => api.post('/ward/hospitalizations', data).then((r) => r.data as HospitalizationListItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kennels'] });
      qc.invalidateQueries({ queryKey: ['hospitalizations'] });
      toast.success('Patient admitted');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to admit patient');
    },
  });
}

export function useDischarge(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { discharge_notes?: string }) =>
      api.patch(`/ward/hospitalizations/${id}/discharge`, data).then((r) => r.data as Hospitalization),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kennels'] });
      qc.invalidateQueries({ queryKey: ['hospitalizations'] });
      toast.success('Patient discharged');
    },
    onError: () => toast.error('Failed to discharge patient'),
  });
}

export function useAddCareLog(hospId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; notes: string }) =>
      api.post(`/ward/hospitalizations/${hospId}/care-logs`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospitalizations', hospId] });
      toast.success('Care log added');
    },
    onError: () => toast.error('Failed to add care log'),
  });
}
