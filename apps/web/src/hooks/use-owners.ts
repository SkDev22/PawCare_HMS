import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Owner, PaginatedResponse } from '@/types/patients';
import type { CreateOwnerInput, UpdateOwnerInput } from '@pawcare/shared';

export function useOwners(params?: { search?: string; cursor?: string; limit?: number }) {
  return useQuery<PaginatedResponse<Owner>>({
    queryKey: ['owners', params],
    queryFn: () => api.get('/owners', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useOwner(id: string | undefined) {
  return useQuery<Owner>({
    queryKey: ['owners', id],
    queryFn: () => api.get(`/owners/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOwnerInput) => api.post('/owners', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Owner created successfully');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create owner');
    },
  });
}

export function useUpdateOwner(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOwnerInput) => api.put(`/owners/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Owner updated');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update owner');
    },
  });
}

export function useDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/owners/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Owner removed');
    },
    onError: () => {
      toast.error('Failed to remove owner');
    },
  });
}
