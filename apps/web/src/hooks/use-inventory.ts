import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type {
  InventoryItem,
  InventoryItemDetail,
  PaginatedInventory,
  PaginatedTransactions,
  InventoryAlerts,
  StockBatch,
  ItemCategory,
  LogTransactionType,
} from '../types/inventory';

export function useInventoryItems(params?: {
  category?:  ItemCategory;
  low_stock?: boolean;
  is_active?: boolean;
  search?:    string;
  cursor?:    string;
  limit?:     number;
}) {
  return useQuery<PaginatedInventory>({
    queryKey: ['inventory', params],
    queryFn:  () => api.get('/inventory', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useInventoryItem(id: string | undefined) {
  return useQuery<InventoryItemDetail>({
    queryKey: ['inventory', id],
    queryFn:  () => api.get(`/inventory/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useInventoryAlerts() {
  return useQuery<InventoryAlerts>({
    queryKey: ['inventory', 'alerts'],
    queryFn:  () => api.get('/inventory/alerts').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useInventoryTransactions(itemId: string | undefined, limit = 20) {
  return useQuery<PaginatedTransactions>({
    queryKey: ['inventory-transactions', itemId],
    queryFn:  () => api.get(`/inventory/${itemId}/transactions`, { params: { limit } }).then((r) => r.data),
    enabled:  !!itemId,
  });
}

export function useItemBatches(itemId: string | undefined) {
  return useQuery<StockBatch[]>({
    queryKey: ['inventory-batches', itemId],
    queryFn:  () => api.get(`/inventory/${itemId}/batches`).then((r) => r.data),
    enabled:  !!itemId,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name:               string;
      category:           ItemCategory;
      unit:               string;
      reorder_threshold?: number;
      sku?:               string;
      supplier_name?:     string;
      supplier_sku?:      string;
      location?:          string;
      is_controlled?:     boolean;
    }) => api.post('/inventory', data).then((r) => r.data as InventoryItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item created');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create item');
    },
  });
}

export function useUpdateInventoryItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<{
      name:              string;
      category:          ItemCategory;
      unit:              string;
      reorder_threshold: number;
      sku:               string;
      supplier_name:     string;
      supplier_sku:      string;
      location:          string;
      is_controlled:     boolean;
      is_active:         boolean;
    }>) => api.put(`/inventory/${id}`, data).then((r) => r.data as InventoryItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item updated');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update item');
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item deleted');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to delete item');
    },
  });
}

export function useLogTransaction(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type:          LogTransactionType;
      quantity:      number;
      batch_id?:     string;
      reference_id?: string;
      notes?:        string;
    }) => api.post(`/inventory/${itemId}/transactions`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-transactions', itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-batches', itemId] });
      toast.success('Transaction logged');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to log transaction');
    },
  });
}
