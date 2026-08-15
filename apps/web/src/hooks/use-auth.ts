import { useMutation } from '@tanstack/react-query';
import type { ChangePasswordInput } from '@pawcare/shared';
import { api } from '../lib/api';

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
  });
}
