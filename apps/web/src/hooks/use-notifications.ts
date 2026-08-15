import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  Notification,
  PaginatedNotifications,
  UnreadCount,
  NotificationPreference,
} from '../types/notifications';

export function useNotifications(params?: {
  unread_only?: boolean;
  cursor?:      string;
  limit?:       number;
}) {
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

export function useDeleteReadNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/notifications/read').then((r) => r.data as { deleted: number }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreference[]>({
    queryKey: ['notifications', 'preferences'],
    queryFn:  () => api.get('/notifications/preferences').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  const key = ['notifications', 'preferences'];

  return useMutation({
    mutationFn: (preferences: { type: string; enabled: boolean }[]) =>
      api
        .put('/notifications/preferences', { preferences })
        .then((r) => r.data as NotificationPreference[]),
    onMutate: async (preferences) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NotificationPreference[]>(key);
      if (previous) {
        const updates = new Map(preferences.map((p) => [p.type, p.enabled]));
        qc.setQueryData<NotificationPreference[]>(
          key,
          previous.map((p) =>
            updates.has(p.type) ? { ...p, enabled: updates.get(p.type)! } : p,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSuccess: (data) => {
      qc.setQueryData(key, data);
    },
  });
}
