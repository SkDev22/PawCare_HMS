import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  RevenueReport,
  AppointmentsReport,
  InventoryUsageReport,
  OutstandingBalancesReport,
  ExpiringItemsReport,
  StockLevelsReport,
  VaccinationsDueReport,
  ServiceSalesReport,
  MedicalRecordsSummaryReport,
  DoctorPerformanceReport,
  DemographicsReport,
  TaxSummaryReport,
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

export function useExpiringItemsReport(days: number) {
  return useQuery<ExpiringItemsReport>({
    queryKey: ['reports', 'expiring-items', days],
    queryFn:  () => api.get('/reports/expiring-items', { params: { days } }).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useStockLevelsReport() {
  return useQuery<StockLevelsReport>({
    queryKey: ['reports', 'stock-levels'],
    queryFn:  () => api.get('/reports/stock-levels').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useVaccinationsDueReport(days: number) {
  return useQuery<VaccinationsDueReport>({
    queryKey: ['reports', 'vaccinations-due', days],
    queryFn:  () => api.get('/reports/vaccinations-due', { params: { days } }).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useServiceSalesReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<ServiceSalesReport>({
    queryKey: ['reports', 'service-sales', startDate, endDate],
    queryFn:  () => api.get('/reports/service-sales', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}

export function useMedicalRecordsSummaryReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<MedicalRecordsSummaryReport>({
    queryKey: ['reports', 'medical-records-summary', startDate, endDate],
    queryFn:  () =>
      api.get('/reports/medical-records-summary', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}

export function useDoctorPerformanceReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<DoctorPerformanceReport>({
    queryKey: ['reports', 'doctor-performance', startDate, endDate],
    queryFn:  () => api.get('/reports/doctor-performance', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}

export function useDemographicsReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<DemographicsReport>({
    queryKey: ['reports', 'demographics', startDate, endDate],
    queryFn:  () => api.get('/reports/demographics', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}

export function useTaxSummaryReport(startDate: string, endDate: string, enabled = true) {
  return useQuery<TaxSummaryReport>({
    queryKey: ['reports', 'tax-summary', startDate, endDate],
    queryFn:  () => api.get('/reports/tax-summary', { params: rangeParams(startDate, endDate) }).then((r) => r.data),
    enabled:  enabled && !!startDate && !!endDate,
    staleTime: 120_000,
  });
}
