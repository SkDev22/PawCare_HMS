import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PermissionKey, StaffRole } from '@pawcare/shared';
import { AuthenticatedRequest } from './authenticate';
import { getEffectivePermissions } from '../lib/role-permissions';
import { asyncHandler } from '../lib/async-handler';

export function authorize(...requiredPermissions: PermissionKey[]): RequestHandler {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { clinic_id, role } = (req as AuthenticatedRequest).user;

    const effective = await getEffectivePermissions(clinic_id, role as StaffRole);
    const allowed = requiredPermissions.every((perm) => effective.includes(perm));

    if (!allowed) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }

    next();
  });
}
