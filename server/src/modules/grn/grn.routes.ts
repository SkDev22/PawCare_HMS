import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { CreateGrnSchema, GrnQuerySchema } from '@pawcare/shared';
import type { GrnQuery } from '@pawcare/shared';
import * as svc from './grn.service';

export const grnRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

grnRouter.get(
  '/',
  authenticate,
  authorize('INVENTORY_READ'),
  validate({ query: GrnQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listGrns(authed(req).user.clinic_id, req.query as unknown as GrnQuery);
      res.json(result);
    } catch (err) { next(err); }
  },
);

grnRouter.post(
  '/',
  authenticate,
  authorize('INVENTORY_WRITE'),
  validate({ body: CreateGrnSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const grn = await svc.createGrn(authed(req).user.clinic_id, authed(req).user.id, req.body);
      res.status(201).json(grn);
    } catch (err) { next(err); }
  },
);

grnRouter.get(
  '/:id',
  authenticate,
  authorize('INVENTORY_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const grn = await svc.getGrn(req.params.id, authed(req).user.clinic_id);
      res.json(grn);
    } catch (err) { next(err); }
  },
);
