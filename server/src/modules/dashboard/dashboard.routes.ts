import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { DashboardQuerySchema } from '@pawcare/shared';
import * as svc from './dashboard.service';

export const dashboardRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

dashboardRouter.get(
  '/summary',
  authenticate,
  authorize('DASHBOARD_READ'),
  validate({ query: DashboardQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date } = req.query as { date?: string };
      const data = await svc.getDashboardSummary(authed(req).user.clinic_id, date);
      res.json(data);
    } catch (err) { next(err); }
  },
);
