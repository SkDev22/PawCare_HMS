import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  RevenueReport,
  AppointmentsReport,
  InventoryUsageReport,
  OutstandingBalancesReport,
} from '../types/reports';

function rangeParams(startDate: string, endDate: string) {
  return { start_date: startDate, end_date: endDate };
}

export function useRevenueReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<RevenueReport>({
    queryKey: ['reports', 'revenue', startDate, endDate],
    queryFn:  () => api.get('/reports/revenue', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}

export function useAppointmentsReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<AppointmentsReport>({
    queryKey: ['reports', 'appointments', startDate, endDate],
    queryFn:  () => api.get('/reports/appointments', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}

export function useInventoryUsageReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<InventoryUsageReport>({
    queryKey: ['reports', 'inventory-usage', startDate, endDate],
    queryFn:  () => api.get('/reports/inventory-usage', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}

export function useOutstandingBalances() {
  return useQuery<OutstandingBalancesReport>({
    queryKey: ['reports', 'outstanding-balances'],
    queryFn:  () => api.get('/reports/outstanding-balances').then((r) => r.data),
    staleTime: 60_000,
  });
}
