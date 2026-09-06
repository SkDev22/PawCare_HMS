import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { CreatePosSaleSchema, PosSaleQuerySchema, CreatePosReturnSchema } from '@pawcare/shared';
import type { CreatePosSaleInput, PosSaleQueryInput, CreatePosReturnInput } from '@pawcare/shared';
import * as svc from './pos.service';

export const posRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

posRouter.get(
  '/sales',
  authenticate,
  authorize('INVOICE_READ'),
  validate({ query: PosSaleQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listSales(
        authed(req).user.clinic_id,
        req.query as unknown as PosSaleQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

posRouter.post(
  '/sales',
  authenticate,
  authorize('PAYMENT_PROCESS'),
  validate({ body: CreatePosSaleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = authed(req).user;
      const sale = await svc.createSale(user.clinic_id, user.id, req.body as CreatePosSaleInput);
      res.status(201).json(sale);
    } catch (err) { next(err); }
  },
);

// Reversing money already taken is a stricter action than taking it — same
// precedent as billing's PAYMENT_VOID being ADMIN-only while PAYMENT_PROCESS
// (creating a sale/payment) also covers RECEPTIONIST.
posRouter.post(
  '/sales/:id/returns',
  authenticate,
  authorize('PAYMENT_VOID'),
  validate({ body: CreatePosReturnSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = authed(req).user;
      const sale = await svc.processReturn(
        user.clinic_id,
        user.id,
        req.params.id,
        req.body as CreatePosReturnInput,
      );
      res.status(201).json(sale);
    } catch (err) { next(err); }
  },
);
