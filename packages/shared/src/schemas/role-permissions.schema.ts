import { z } from 'zod';
import { EDITABLE_ROLES, EDITABLE_PERMISSION_KEYS } from '../constants/permissions';

export const EditableRoleEnum = z.enum(EDITABLE_ROLES);

export const PermissionKeyEnum = z.enum(
  EDITABLE_PERMISSION_KEYS as [string, ...string[]],
);

export const ToggleRolePermissionSchema = z.object({
  role:       EditableRoleEnum,
  permission: PermissionKeyEnum,
  granted:    z.boolean(),
});

export type ToggleRolePermissionInput = z.infer<typeof ToggleRolePermissionSchema>;
