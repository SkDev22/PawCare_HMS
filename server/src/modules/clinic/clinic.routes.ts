import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { UpdateClinicSchema, UpsertClinicHoursSchema } from '@pawcare/shared';
import * as svc from './clinic.service';

export const clinicRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// Single-resource endpoints scoped to the authenticated staff member's own
// clinic — there is no :id param, so a client can never request another
// tenant's profile by guessing an id.

clinicRouter.get(
  '/',
  authenticate,
  authorize('CLINIC_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clinic = await svc.getClinic(authed(req).user.clinic_id);
      res.json(clinic);
    } catch (err) { next(err); }
  },
);

clinicRouter.put(
  '/',
  authenticate,
  authorize('CLINIC_WRITE'),
  validate({ body: UpdateClinicSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clinic = await svc.updateClinic(authed(req).user.clinic_id, req.body);
      res.json(clinic);
    } catch (err) { next(err); }
  },
);

// ── Business Hours ────────────────────────────────────────────────────────────

clinicRouter.get(
  '/hours',
  authenticate,
  authorize('CLINIC_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = await svc.getClinicHours(authed(req).user.clinic_id);
      res.json(hours);
    } catch (err) { next(err); }
  },
);

clinicRouter.put(
  '/hours',
  authenticate,
  authorize('CLINIC_WRITE'),
  validate({ body: UpsertClinicHoursSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = await svc.upsertClinicHours(authed(req).user.clinic_id, req.body);
      res.json(hours);
    } catch (err) { next(err); }
  },
);
