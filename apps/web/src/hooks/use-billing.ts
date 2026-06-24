import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type {
  Invoice,
  InvoiceListItem,
  PaginatedInvoices,
  InvoicePayment,
  LineItem,
  Service,
  InvoiceStatus,
  PaymentMethod,
} from '../types/billing';

export function useInvoices(params?: {
  status?: InvoiceStatus;
  owner_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  return useQuery<PaginatedInvoices>({
    queryKey: ['invoices', params],
    queryFn: () => api.get('/billing', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery<Invoice>({
    queryKey: ['invoices', id],
    queryFn: () => api.get(`/billing/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useServices() {
  return useQuery<Service[]>({
    queryKey: ['billing-services'],
    queryFn: () => api.get('/billing/services').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      owner_id: string;
      appointment_id?: string;
      due_date?: string;
      notes?: string;
      tax_amount?: number;
      discount_amount?: number;
    }) => api.post('/billing', data).then((r) => r.data as Invoice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
    },
    onError: () => toast.error('Failed to create invoice'),
  });
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      due_date?: string;
      notes?: string;
      tax_amount?: number;
      discount_amount?: number;
    }) => api.put(`/billing/${id}`, data).then((r) => r.data as Invoice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
    },
    onError: () => toast.error('Failed to update invoice'),
  });
}

export function useUpdateInvoiceStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: InvoiceStatus) =>
      api.patch(`/billing/${id}/status`, { status }).then((r) => r.data as InvoiceListItem),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      const label: Partial<Record<InvoiceStatus, string>> = {
        SENT:      'Invoice sent',
        CANCELLED: 'Invoice cancelled',
        OVERDUE:   'Marked as overdue',
        REFUNDED:  'Invoice refunded',
        PAID:      'Invoice marked as paid',
      };
      toast.success(label[status] ?? 'Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });
}

export function useAddLineItem(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      service_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }) =>
      api
        .post(`/billing/${invoiceId}/line-items`, data)
        .then((r) => r.data as LineItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      toast.success('Line item added');
    },
    onError: () => toast.error('Failed to add line item'),
  });
}

export function useRemoveLineItem(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) =>
      api.delete(`/billing/${invoiceId}/line-items/${lineId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      toast.success('Line item removed');
    },
    onError: () => toast.error('Failed to remove line item'),
  });
}

export function useRecordPayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; method: PaymentMethod; notes?: string }) =>
      api
        .post(`/billing/${invoiceId}/payments`, data)
        .then((r) => r.data as InvoicePayment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded');
    },
    onError: () => toast.error('Failed to record payment'),
  });
}
