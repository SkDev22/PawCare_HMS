import { PERMISSIONS, type PermissionKey, type StaffRole } from '@pawcare/shared';

export function hasPermission(role: StaffRole | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly StaffRole[]).includes(role);
}
