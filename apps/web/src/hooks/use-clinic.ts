import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateClinicInput, UpsertClinicHoursInput } from '@pawcare/shared';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export interface ClinicProfile {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  timezone: string;
  currency: string;
  theme_color: string;
  plan: string;
  trial_ends_at: string | null;
  tax_rate: string;
  invoice_prefix: string;
  invoice_due_days: number;
  invoice_footer_text: string | null;
  seat_usage: { used: number; limit: number | null };
  created_at: string;
  updated_at: string;
}

export interface ClinicHoursEntry {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export function useClinic() {
  return useQuery<ClinicProfile>({
    queryKey: ['clinic'],
    queryFn: () => api.get('/clinic').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateClinic() {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: (data: UpdateClinicInput) =>
      api.put<ClinicProfile>('/clinic', data).then((r) => r.data),
    onSuccess: (clinic) => {
      qc.setQueryData(['clinic'], clinic);
      updateUser({ clinic_name: clinic.name });
    },
  });
}

// ── Business Hours ────────────────────────────────────────────────────────────

export function useClinicHours() {
  return useQuery<ClinicHoursEntry[]>({
    queryKey: ['clinic', 'hours'],
    queryFn: () => api.get('/clinic/hours').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateClinicHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertClinicHoursInput) =>
      api.put<ClinicHoursEntry[]>('/clinic/hours', data).then((r) => r.data),
    onSuccess: (hours) => {
      qc.setQueryData(['clinic', 'hours'], hours);
    },
  });
}
