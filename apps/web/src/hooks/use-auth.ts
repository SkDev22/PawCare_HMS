import { useMutation } from '@tanstack/react-query';
import type { ChangePasswordInput, UpdateOwnProfileInput, AuthUser } from '@pawcare/shared';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
  });
}

export function useUpdateProfile() {
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: (data: UpdateOwnProfileInput) =>
      api.put<AuthUser>('/staff/me', data).then((res) => res.data),
    onSuccess: (staff) => {
      updateUser({
        first_name: staff.first_name,
        last_name: staff.last_name,
        ...(staff.phone !== undefined ? { phone: staff.phone } : {}),
        ...(staff.specialization !== undefined ? { specialization: staff.specialization } : {}),
        ...(staff.license_number !== undefined ? { license_number: staff.license_number } : {}),
      });
    },
  });
}

export function useRevokeOtherSessions() {
  return useMutation({
    mutationFn: () =>
      api.post<{ revokedCount: number }>('/auth/sessions/revoke-others').then((res) => res.data),
  });
}
