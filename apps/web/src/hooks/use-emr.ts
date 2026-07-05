import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type {
  MedicalRecord,
  PaginatedMedicalRecords,
  SoapNote,
  Vitals,
  Diagnosis,
  Prescription,
  Charge,
} from '../types/emr';

type ApiError = { response?: { data?: { error?: { message?: string } } } };

function errMsg(err: ApiError, fallback: string) {
  return err?.response?.data?.error?.message ?? fallback;
}

export function useMedicalRecords(params?: {
  search?: string;
  pet_id?: string;
  vet_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  return useQuery<PaginatedMedicalRecords>({
    queryKey: ['medical-records', params],
    queryFn: () => api.get('/medical-records', { params }).then((r) => r.data),
  });
}

export function useMedicalRecord(id: string | undefined) {
  return useQuery<MedicalRecord>({
    queryKey: ['medical-records', id],
    queryFn: () => api.get(`/medical-records/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMedicalRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      pet_id: string;
      vet_id?: string;
      appointment_id?: string;
      visit_date?: string;
      chief_complaint?: string;
    }) => api.post('/medical-records', data).then((r) => r.data as MedicalRecord),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records'] });
      toast.success('Medical record created');
    },
    onError: () => toast.error('Failed to create medical record'),
  });
}

export function useUpdateMedicalRecord(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { chief_complaint?: string; visit_date?: string }) =>
      api.put(`/medical-records/${id}`, data).then((r) => r.data as MedicalRecord),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records'] });
      toast.success('Record updated');
    },
    onError: () => toast.error('Failed to update record'),
  });
}

export function useUpsertSoapNote(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    }) => api.put(`/medical-records/${recordId}/soap`, data).then((r) => r.data as SoapNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId] });
      toast.success('SOAP note saved');
    },
    onError: () => toast.error('Failed to save SOAP note'),
  });
}

export function useUpsertVitals(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      weight_kg?: number;
      temperature_c?: number;
      heart_rate_bpm?: number;
      respiratory_rate?: number;
      blood_pressure?: string;
      body_condition_score?: number;
    }) => api.put(`/medical-records/${recordId}/vitals`, data).then((r) => r.data as Vitals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId] });
      toast.success('Vitals saved');
    },
    onError: () => toast.error('Failed to save vitals'),
  });
}

export function useAddDiagnosis(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code?: string; name: string; is_primary?: boolean; notes?: string }) =>
      api.post(`/medical-records/${recordId}/diagnoses`, data).then((r) => r.data as Diagnosis),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId] });
      toast.success('Diagnosis added');
    },
    onError: () => toast.error('Failed to add diagnosis'),
  });
}

export function useRemoveDiagnosis(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (diagId: string) =>
      api.delete(`/medical-records/${recordId}/diagnoses/${diagId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId] });
      toast.success('Diagnosis removed');
    },
    onError: () => toast.error('Failed to remove diagnosis'),
  });
}

export function useAddPrescription(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      drug_name: string;
      dosage: string;
      frequency: string;
      duration_days?: number;
      quantity?: number;
      refills_remaining?: number;
      instructions?: string;
      expires_at?: string;
      item_id?: string;
    }) =>
      api
        .post(`/medical-records/${recordId}/prescriptions`, data)
        .then((r) => r.data as Prescription),
    onSuccess: (rx) => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId] });
      if (rx.item_id) qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Prescription added');
    },
    onError: (err: ApiError) => toast.error(errMsg(err, 'Failed to add prescription')),
  });
}

export function useDeactivatePrescription(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rxId: string) =>
      api.delete(`/medical-records/${recordId}/prescriptions/${rxId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Prescription deactivated');
    },
    onError: () => toast.error('Failed to deactivate prescription'),
  });
}

// ── Charges (visit → invoice bridge) ───────────────────────────────────────────

export function useCharges(recordId: string | undefined) {
  return useQuery<Charge[]>({
    queryKey: ['medical-records', recordId, 'charges'],
    queryFn: () => api.get(`/medical-records/${recordId}/charges`).then((r) => r.data),
    enabled: !!recordId,
  });
}

export function useAddCharge(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { item_id?: string; service_id?: string; quantity: number; description?: string }) =>
      api.post(`/medical-records/${recordId}/charges`, data).then((r) => r.data as Charge),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId, 'charges'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Charge added');
    },
    onError: (err: ApiError) => toast.error(errMsg(err, 'Failed to add charge')),
  });
}

export function useRemoveCharge(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chargeId: string) =>
      api.delete(`/medical-records/${recordId}/charges/${chargeId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', recordId, 'charges'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Charge removed');
    },
    onError: (err: ApiError) => toast.error(errMsg(err, 'Failed to remove charge')),
  });
}
