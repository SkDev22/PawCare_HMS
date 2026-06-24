import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Notification, PaginatedNotifications, UnreadCount } from '../types/notifications';

export function useNotifications(params?: { unread_only?: boolean; limit?: number }) {
  return useQuery<PaginatedNotifications>({
    queryKey: ['notifications', params],
    queryFn:  () => api.get('/notifications', { params }).then((r) => r.data),
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCount>({
    queryKey: ['notifications', 'unread-count'],
    queryFn:  () => api.get('/notifications/unread-count').then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/notifications/${id}/read`).then((r) => r.data as Notification),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
