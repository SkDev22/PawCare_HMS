import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Pet, PaginatedResponse } from '@/types/patients';
import type { CreatePetInput, UpdatePetInput, CreateAllergyInput } from '@pawcare/shared';

export function usePets(params?: {
  owner_id?: string;
  species?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery<PaginatedResponse<Pet>>({
    queryKey: ['pets', params],
    queryFn: () => api.get('/pets', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function usePet(id: string | undefined) {
  return useQuery<Pet>({
    queryKey: ['pets', id],
    queryFn: () => api.get(`/pets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePetInput) => api.post('/pets', data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['pets'] });
      qc.invalidateQueries({ queryKey: ['owners', variables.owner_id] });
      toast.success('Pet added successfully');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to add pet');
    },
  });
}

export function useUpdatePet(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePetInput) => api.put(`/pets/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pets'] });
      toast.success('Pet updated');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update pet');
    },
  });
}

export function useAddAllergy(petId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAllergyInput) =>
      api.post(`/pets/${petId}/allergies`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pets', petId] });
      toast.success('Allergy recorded');
    },
    onError: () => {
      toast.error('Failed to record allergy');
    },
  });
}
