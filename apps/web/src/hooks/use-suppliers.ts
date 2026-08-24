import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Supplier } from '../types/supplier';

export function useSuppliers(params?: { search?: string; limit?: number }) {
  return useQuery<Supplier[]>({
    queryKey: ['suppliers', params],
    queryFn:  () => api.get('/suppliers', { params }).then((r) => r.data),
    staleTime: 30_000,
  });
}
