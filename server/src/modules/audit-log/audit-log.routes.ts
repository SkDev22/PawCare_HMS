import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { AuditLogQuerySchema } from '@pawcare/shared';
import type { AuditLogQueryInput } from '@pawcare/shared';
import * as svc from './audit-log.service';

export const auditLogRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

auditLogRouter.get(
  '/',
  authenticate,
  authorize('AUDIT_LOG_READ'),
  validate({ query: AuditLogQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listAuditLog(
        authed(req).user.clinic_id,
        req.query as unknown as AuditLogQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);
