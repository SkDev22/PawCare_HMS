import { Request, Response, NextFunction } from 'express';
import { PERMISSIONS, PermissionKey } from '@pawcare/shared';
import { AuthenticatedRequest } from './authenticate';

export function authorize(...requiredPermissions: PermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { role } = (req as AuthenticatedRequest).user;

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
