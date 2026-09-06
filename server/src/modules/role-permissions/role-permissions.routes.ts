import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { ToggleRolePermissionSchema, EDITABLE_ROLES, type EditableRole, type StaffRole } from '@pawcare/shared';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { AppError } from '../../lib/errors';
import * as svc from './role-permissions.service';

export const rolePermissionsRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

function assertEditableRole(role: string): asserts role is EditableRole {
  if (!(EDITABLE_ROLES as readonly string[]).includes(role)) {
    throw new AppError('NOT_FOUND', `Unknown or non-editable role: ${role}`, 404);
  }
}

rolePermissionsRouter.get(
  '/',
  authenticate,
  authorize('ROLE_PERMISSIONS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matrix = await svc.getMatrix(authed(req).user.clinic_id);
      res.json(matrix);
    } catch (err) { next(err); }
  },
);

rolePermissionsRouter.put(
  '/toggle',
  authenticate,
  authorize('ROLE_PERMISSIONS_MANAGE'),
  validate({ body: ToggleRolePermissionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, permission, granted } = req.body;
      await svc.toggle(authed(req).user.clinic_id, role, permission, granted, authed(req).user.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

rolePermissionsRouter.delete(
  '/:role/reset',
  authenticate,
  authorize('ROLE_PERMISSIONS_MANAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.params;
      assertEditableRole(role);
      await svc.reset(authed(req).user.clinic_id, role);
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

rolePermissionsRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clinic_id, role } = authed(req).user;
      const permissions = await svc.getMine(clinic_id, role as StaffRole);
      res.json({ permissions });
    } catch (err) { next(err); }
  },
);
