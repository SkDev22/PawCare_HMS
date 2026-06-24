import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  CreateLabOrderSchema,
  UpdateLabOrderStatusSchema,
  LabOrderQuerySchema,
  AddLabResultsBatchSchema,
} from '@pawcare/shared';
import type { LabOrderQueryInput } from '@pawcare/shared';
import * as svc from './lab.service';

export const labRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ── List & Create orders ──────────────────────────────────────────────────────

labRouter.get(
  '/',
  authenticate,
  authorize('LAB_ORDER_WRITE'),
  validate({ query: LabOrderQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listOrders(
        authed(req).user.clinic_id,
        req.query as unknown as LabOrderQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

labRouter.post(
  '/',
  authenticate,
  authorize('LAB_ORDER_WRITE'),
  validate({ body: CreateLabOrderSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await svc.createOrder(
        authed(req).user.clinic_id,
        authed(req).user.id,
        req.body,
      );
      res.status(201).json(order);
    } catch (err) { next(err); }
  },
);

// ── Single order ──────────────────────────────────────────────────────────────

labRouter.get(
  '/:id',
  authenticate,
  authorize('LAB_ORDER_WRITE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await svc.getOrder(req.params.id, authed(req).user.clinic_id);
      res.json(order);
    } catch (err) { next(err); }
  },
);

// ── Status transition ─────────────────────────────────────────────────────────

labRouter.patch(
  '/:id/status',
  authenticate,
  authorize('LAB_ORDER_WRITE'),
  validate({ body: UpdateLabOrderStatusSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await svc.updateStatus(
        req.params.id,
        authed(req).user.clinic_id,
        req.body.status,
      );
      res.json(order);
    } catch (err) { next(err); }
  },
);

// ── Results ───────────────────────────────────────────────────────────────────

labRouter.post(
  '/:id/results',
  authenticate,
  authorize('LAB_RESULT_WRITE'),
  validate({ body: AddLabResultsBatchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await svc.addResults(
        req.params.id,
        authed(req).user.clinic_id,
        req.body,
      );
      res.status(201).json(order);
    } catch (err) { next(err); }
  },
);
