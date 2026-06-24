import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { ReportRangeSchema } from '@pawcare/shared';
import * as svc from './reports.service';

export const reportsRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

reportsRouter.get(
  '/revenue',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getRevenueReport(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/appointments',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getAppointmentsReport(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/inventory-usage',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getInventoryUsageReport(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/outstanding-balances',
  authenticate,
  authorize('REPORT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await svc.getOutstandingBalances(authed(req).user.clinic_id);
      res.json(data);
    } catch (err) { next(err); }
  },
);
