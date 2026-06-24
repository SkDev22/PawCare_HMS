import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  InvoiceQuerySchema,
  AddLineItemSchema,
  RecordPaymentSchema,
  UpdateInvoiceStatusSchema,
  CreateServiceSchema,
} from '@pawcare/shared';
import type { InvoiceQueryInput } from '@pawcare/shared';
import * as svc from './billing.service';

export const billingRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ── Services catalogue ─────────────────────────────────────────────────────────

billingRouter.get(
  '/services',
  authenticate,
  authorize('INVOICE_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const services = await svc.listServices(authed(req).user.clinic_id);
      res.json(services);
    } catch (err) { next(err); }
  },
);

billingRouter.post(
  '/services',
  authenticate,
  authorize('INVOICE_WRITE'),
  validate({ body: CreateServiceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = await svc.createService(authed(req).user.clinic_id, req.body);
      res.status(201).json(service);
    } catch (err) { next(err); }
  },
);

// ── Invoice list & create ──────────────────────────────────────────────────────

billingRouter.get(
  '/',
  authenticate,
  authorize('INVOICE_READ'),
  validate({ query: InvoiceQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listInvoices(
        authed(req).user.clinic_id,
        req.query as unknown as InvoiceQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

billingRouter.post(
  '/',
  authenticate,
  authorize('INVOICE_WRITE'),
  validate({ body: CreateInvoiceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoice = await svc.createInvoice(authed(req).user.clinic_id, req.body);
      res.status(201).json(invoice);
    } catch (err) { next(err); }
  },
);

// ── Single invoice ─────────────────────────────────────────────────────────────

billingRouter.get(
  '/:id',
  authenticate,
  authorize('INVOICE_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoice = await svc.getInvoice(req.params.id, authed(req).user.clinic_id);
      res.json(invoice);
    } catch (err) { next(err); }
  },
);

billingRouter.put(
  '/:id',
  authenticate,
  authorize('INVOICE_WRITE'),
  validate({ body: UpdateInvoiceSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoice = await svc.updateInvoice(req.params.id, authed(req).user.clinic_id, req.body);
      res.json(invoice);
    } catch (err) { next(err); }
  },
);

billingRouter.patch(
  '/:id/status',
  authenticate,
  authorize('INVOICE_WRITE'),
  validate({ body: UpdateInvoiceStatusSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.updateStatus(
        req.params.id,
        authed(req).user.clinic_id,
        req.body.status,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

// ── Line items ─────────────────────────────────────────────────────────────────

billingRouter.post(
  '/:id/line-items',
  authenticate,
  authorize('INVOICE_WRITE'),
  validate({ body: AddLineItemSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lineItem = await svc.addLineItem(req.params.id, authed(req).user.clinic_id, req.body);
      res.status(201).json(lineItem);
    } catch (err) { next(err); }
  },
);

billingRouter.delete(
  '/:id/line-items/:lineId',
  authenticate,
  authorize('INVOICE_WRITE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.removeLineItem(req.params.id, req.params.lineId, authed(req).user.clinic_id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
);

// ── Payments ───────────────────────────────────────────────────────────────────

billingRouter.post(
  '/:id/payments',
  authenticate,
  authorize('PAYMENT_PROCESS'),
  validate({ body: RecordPaymentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await svc.recordPayment(req.params.id, authed(req).user.clinic_id, req.body);
      res.status(201).json(payment);
    } catch (err) { next(err); }
  },
);
