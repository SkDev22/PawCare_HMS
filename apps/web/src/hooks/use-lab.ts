import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { LabOrder, LabOrderListItem, PaginatedLabOrders, LabStatus } from '../types/lab';

export function useLabOrders(params?: {
  pet_id?:    string;
  status?:    LabStatus;
  date_from?: string;
  date_to?:   string;
  limit?:     number;
}) {
  return useQuery<PaginatedLabOrders>({
    queryKey: ['lab-orders', params],
    queryFn:  () => api.get('/lab-orders', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useLabOrder(id: string | undefined) {
  return useQuery<LabOrder>({
    queryKey: ['lab-orders', id],
    queryFn:  () => api.get(`/lab-orders/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useCreateLabOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      pet_id:             string;
      panel_name:         string;
      is_external?:       boolean;
      external_lab_name?: string;
      notes?:             string;
      medical_record_id?: string;
    }) => api.post('/lab-orders', data).then((r) => r.data as LabOrder),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-orders'] });
      toast.success('Lab order created');
    },
    onError: () => toast.error('Failed to create lab order'),
  });
}

export function useUpdateLabOrderStatus(id: string) {
  const qc = useQueryClient();

  const STATUS_LABELS: Partial<Record<LabStatus, string>> = {
    SAMPLE_COLLECTED: 'Sample collected',
    IN_PROGRESS:      'Marked in progress',
    COMPLETED:        'Order completed',
    CANCELLED:        'Order cancelled',
  };

  return useMutation({
    mutationFn: (status: LabStatus) =>
      api.patch(`/lab-orders/${id}/status`, { status }).then((r) => r.data as LabOrder),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ['lab-orders'] });
      toast.success(STATUS_LABELS[status] ?? 'Status updated');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update status');
    },
  });
}

export function useAddLabResults(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (results: Array<{
      test_name:         string;
      value:             string;
      unit?:             string;
      reference_min?:    string;
      reference_max?:    string;
      is_abnormal:       boolean;
      medical_record_id?: string;
    }>) =>
      api
        .post(`/lab-orders/${orderId}/results`, { results })
        .then((r) => r.data as LabOrder),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lab-orders'] });
      const abnormal = data.results.filter((r) => r.is_abnormal).length;
      if (abnormal > 0) {
        toast.warning(`${abnormal} abnormal result${abnormal !== 1 ? 's' : ''} flagged — vet notified`);
      } else {
        toast.success('Results recorded');
      }
    },
    onError: () => toast.error('Failed to record results'),
  });
}
