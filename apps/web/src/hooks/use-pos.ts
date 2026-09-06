import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { PosSale, PaginatedPosSales, PosReturnLine } from '../types/pos';

export function useRecentSales(params?: { cursor?: string; limit?: number }) {
  return useQuery<PaginatedPosSales>({
    queryKey: ['pos-sales', params],
    queryFn: () => api.get('/pos/sales', { params }).then((r) => r.data),
    staleTime: 15_000,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner_id?: string;
      customer_name?: string;
      items: Array<{ item_id: string; quantity: number; batch_id?: string }>;
      payment_method: string;
      discount_amount?: number;
      amount_tendered?: number;
    }) => api.post('/pos/sales', data).then((r) => r.data as PosSale),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to complete sale');
    },
  });
}

export function useProcessReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      saleId,
      ...data
    }: {
      saleId: string;
      lines: PosReturnLine[];
      reason?: string;
      refund_method: string;
    }) => api.post(`/pos/sales/${saleId}/returns`, data).then((r) => r.data as PosSale),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Return processed');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to process return');
    },
  });
}
