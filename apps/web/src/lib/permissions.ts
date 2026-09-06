import type { PermissionKey } from '@pawcare/shared';

export function hasPermission(
  effectivePermissions: PermissionKey[] | undefined,
  permission: PermissionKey,
): boolean {
  if (!effectivePermissions) return false;
  return effectivePermissions.includes(permission);
}
