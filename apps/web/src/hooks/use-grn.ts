import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type {
  GoodsReceivedNoteDetail,
  PaginatedGrns,
  CreateGrnInput,
} from '../types/grn';

export function useGrnList(params?: { search?: string; cursor?: string; limit?: number }) {
  return useQuery<PaginatedGrns>({
    queryKey: ['grn', params],
    queryFn:  () => api.get('/grn', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useGrn(id: string | undefined) {
  return useQuery<GoodsReceivedNoteDetail>({
    queryKey: ['grn', id],
    queryFn:  () => api.get(`/grn/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useCreateGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGrnInput) => api.post('/grn', data).then((r) => r.data as GoodsReceivedNoteDetail),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grn'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Goods received note created');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create GRN');
    },
  });
}
