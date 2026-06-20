import { Response, NextFunction } from 'express';
import { PERMISSIONS, PermissionKey } from '@pawcare/shared';
import { AuthenticatedRequest } from './authenticate';

export function authorize(...requiredPermissions: PermissionKey[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const { role } = req.user;

    const allowed = requiredPermissions.every((perm) =>
      (PERMISSIONS[perm] as readonly string[]).includes(role),
    );

    if (!allowed) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }

    next();
  };
}
