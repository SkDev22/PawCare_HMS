import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { SupplierQuerySchema } from '@pawcare/shared';
import type { SupplierQuery } from '@pawcare/shared';
import * as svc from './suppliers.service';

export const suppliersRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

suppliersRouter.get(
  '/',
  authenticate,
  authorize('INVENTORY_READ'),
  validate({ query: SupplierQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suppliers = await svc.listSuppliers(
        authed(req).user.clinic_id,
        req.query as unknown as SupplierQuery,
      );
      res.json(suppliers);
    } catch (err) { next(err); }
  },
);
