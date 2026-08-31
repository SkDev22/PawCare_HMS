import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AuditEntityType, PaginatedAuditLog } from '../types/audit-log';

export function useAuditLog(params: {
  entity_type?: AuditEntityType;
  medical_record_id?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery<PaginatedAuditLog>({
    queryKey: ['audit-log', params],
    queryFn: () => api.get('/audit-log', { params }).then((r) => r.data),
    staleTime: 15_000,
  });
}
