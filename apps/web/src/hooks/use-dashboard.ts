import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DashboardSummary } from '../types/dashboard';

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn:  () => api.get('/dashboard/summary').then((r) => r.data),
    staleTime: 60_000,
  });
}
