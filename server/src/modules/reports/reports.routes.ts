import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { ReportRangeSchema, ReportDaysSchema } from '@pawcare/shared';
import * as svc from './reports.service';

export const reportsRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ── Data Export ────────────────────────────────────────────────────────────────

reportsRouter.get(
  '/export/patients',
  authenticate,
  authorize('REPORT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csv = await svc.exportPatientsCsv(authed(req).user.clinic_id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="patients.csv"');
      res.send(csv);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/export/invoices',
  authenticate,
  authorize('REPORT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csv = await svc.exportInvoicesCsv(authed(req).user.clinic_id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
      res.send(csv);
    } catch (err) { next(err); }
  },
);

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

reportsRouter.get(
  '/expiring-items',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportDaysSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { days } = req.query as unknown as { days: number };
      const data = await svc.getExpiringItems(authed(req).user.clinic_id, days);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/stock-levels',
  authenticate,
  authorize('REPORT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await svc.getStockLevels(authed(req).user.clinic_id);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/vaccinations-due',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportDaysSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { days } = req.query as unknown as { days: number };
      const data = await svc.getVaccinationsDue(authed(req).user.clinic_id, days);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/service-sales',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getServiceSales(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/medical-records-summary',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getMedicalRecordsSummary(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/doctor-performance',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getDoctorPerformance(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/demographics',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getDemographics(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);

reportsRouter.get(
  '/tax-summary',
  authenticate,
  authorize('REPORT_READ'),
  validate({ query: ReportRangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };
      const data = await svc.getTaxSummary(authed(req).user.clinic_id, start_date, end_date);
      res.json(data);
    } catch (err) { next(err); }
  },
);
