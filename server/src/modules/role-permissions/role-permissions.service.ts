import {
  EDITABLE_ROLES,
  EDITABLE_PERMISSION_KEYS,
  PERMISSION_CATALOG,
  PERMISSIONS,
  type EditableRole,
  type PermissionKey,
  type StaffRole,
  type FeatureKey,
} from '@pawcare/shared';
import { prisma } from '../../lib/prisma';
import { getEffectivePermissions } from '../../lib/role-permissions';
import { emitPermissionsUpdated } from '../../lib/socket';

export interface RoleMatrixEntry {
  key: PermissionKey;
  module: string;
  label: string;
  granted: boolean;
  isOverridden: boolean;
  requiredFeature?: FeatureKey;
}

// Powers the Roles & Permissions Settings card: for each editable role, the
// full catalog with a merged (default + override) granted flag, plus whether
// that flag is an explicit override so the UI can show "customized" state.
export async function getMatrix(
  clinicId: string,
): Promise<Record<EditableRole, RoleMatrixEntry[]>> {
  const overrides = await prisma.rolePermissionOverride.findMany({
    where: { clinic_id: clinicId, role: { in: [...EDITABLE_ROLES] } },
  });
  const overrideMap = new Map(
    overrides.map((o) => [`${o.role}:${o.permission}`, o.granted]),
  );

  const result = {} as Record<EditableRole, RoleMatrixEntry[]>;
  for (const role of EDITABLE_ROLES) {
    result[role] = EDITABLE_PERMISSION_KEYS.map((key) => {
      const override = overrideMap.get(`${role}:${key}`);
      const catalogEntry = PERMISSION_CATALOG[key];
      return {
        key,
        module: catalogEntry.module,
        label: catalogEntry.label,
        granted: override ?? (PERMISSIONS[key] as readonly string[]).includes(role),
        isOverridden: override !== undefined,
        ...(catalogEntry.requiredFeature ? { requiredFeature: catalogEntry.requiredFeature } : {}),
      };
    });
  }
  return result;
}

async function notifyStaffWithRole(clinicId: string, role: EditableRole): Promise<void> {
  const staff = await prisma.staffUser.findMany({
    where: { clinic_id: clinicId, role, is_active: true, deleted_at: null },
    select: { id: true },
  });
  for (const s of staff) emitPermissionsUpdated(s.id);
}

export async function toggle(
  clinicId: string,
  role: EditableRole,
  permission: PermissionKey,
  granted: boolean,
  updatedBy: string,
): Promise<void> {
  await prisma.rolePermissionOverride.upsert({
    where: { clinic_id_role_permission: { clinic_id: clinicId, role, permission } },
    create: { clinic_id: clinicId, role, permission, granted, updated_by: updatedBy },
    update: { granted, updated_by: updatedBy },
  });
  await notifyStaffWithRole(clinicId, role);
}

export async function reset(clinicId: string, role: EditableRole): Promise<void> {
  await prisma.rolePermissionOverride.deleteMany({
    where: { clinic_id: clinicId, role },
  });
  await notifyStaffWithRole(clinicId, role);
}

export async function getMine(
  clinicId: string,
  role: StaffRole,
): Promise<PermissionKey[]> {
  return getEffectivePermissions(clinicId, role);
}
