import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EditableRole, PermissionKey, FeatureKey } from '@pawcare/shared';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export interface RoleMatrixEntry {
  key: PermissionKey;
  module: string;
  label: string;
  granted: boolean;
  isOverridden: boolean;
  requiredFeature?: FeatureKey;
}

export type RoleMatrix = Record<EditableRole, RoleMatrixEntry[]>;

const MATRIX_KEY = ['role-permissions', 'matrix'];

export function useRolePermissionMatrix() {
  return useQuery<RoleMatrix>({
    queryKey: MATRIX_KEY,
    queryFn: () => api.get('/role-permissions').then((r) => r.data),
    staleTime: 15_000,
  });
}

export function useTogglePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { role: EditableRole; permission: PermissionKey; granted: boolean }) =>
      api.put('/role-permissions/toggle', vars),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: MATRIX_KEY });
      const previous = qc.getQueryData<RoleMatrix>(MATRIX_KEY);
      if (previous) {
        qc.setQueryData<RoleMatrix>(MATRIX_KEY, {
          ...previous,
          [vars.role]: previous[vars.role].map((entry) =>
            entry.key === vars.permission
              ? { ...entry, granted: vars.granted, isOverridden: true }
              : entry,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(MATRIX_KEY, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MATRIX_KEY });
    },
  });
}

export function useResetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: EditableRole) => api.delete(`/role-permissions/${role}/reset`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MATRIX_KEY });
    },
  });
}

// Refetches the caller's own effective permissions and pushes them into the
// auth store — used on the permissions:updated socket event so a mid-session
// grant/revoke takes effect without the affected staff member logging out.
export function useRefreshMyPermissions() {
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: () =>
      api.get('/role-permissions/me').then((r) => r.data as { permissions: PermissionKey[] }),
    onSuccess: (data) => {
      updateUser({ effective_permissions: data.permissions });
    },
  });
}
