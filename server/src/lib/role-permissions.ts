import { PERMISSIONS, PermissionKey, StaffRole } from '@pawcare/shared';
import { prisma } from './prisma';

const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

// ADMIN always resolves to every permission — never given override rows
// (enforced at the write layer in role-permissions.service.ts) — so the
// existing "must always have at least one ADMIN" safety guard elsewhere in
// the codebase never has to reason about an admin who's had access edited
// away.
export async function getEffectivePermissions(
  clinicId: string,
  role: StaffRole,
): Promise<PermissionKey[]> {
  if (role === 'ADMIN') return [...ALL_PERMISSION_KEYS];

  const overrides = await prisma.rolePermissionOverride.findMany({
    where: { clinic_id: clinicId, role },
    select: { permission: true, granted: true },
  });
  const overrideMap = new Map(overrides.map((o) => [o.permission, o.granted]));

  return ALL_PERMISSION_KEYS.filter((key) =>
    overrideMap.has(key)
      ? (overrideMap.get(key) as boolean)
      : (PERMISSIONS[key] as readonly string[]).includes(role),
  );
}
