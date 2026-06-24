import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  AdmitPetSchema,
  DischargePetSchema,
  AddCareLogSchema,
  HospitalizationQuerySchema,
} from '@pawcare/shared';
import type { HospitalizationQuery } from '@pawcare/shared';
import * as svc from './ward.service';

export const wardRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ── Kennels ───────────────────────────────────────────────────────────────────

wardRouter.get(
  '/kennels',
  authenticate,
  authorize('WARD_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kennels = await svc.listKennels(authed(req).user.clinic_id);
      res.json(kennels);
    } catch (err) { next(err); }
  },
);

// ── Hospitalizations ──────────────────────────────────────────────────────────

wardRouter.get(
  '/hospitalizations',
  authenticate,
  authorize('WARD_READ'),
  validate({ query: HospitalizationQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listHospitalizations(
        authed(req).user.clinic_id,
        req.query as unknown as HospitalizationQuery,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

wardRouter.post(
  '/hospitalizations',
  authenticate,
  authorize('WARD_WRITE'),
  validate({ body: AdmitPetSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hosp = await svc.admitPet(
        authed(req).user.clinic_id,
        authed(req).user.id,
        req.body,
      );
      res.status(201).json(hosp);
    } catch (err) { next(err); }
  },
);

wardRouter.get(
  '/hospitalizations/:id',
  authenticate,
  authorize('WARD_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hosp = await svc.getHospitalization(req.params.id, authed(req).user.clinic_id);
      if (!hosp) return res.status(404).json({ error: { message: 'Not found' } });
      res.json(hosp);
    } catch (err) { next(err); }
  },
);

wardRouter.patch(
  '/hospitalizations/:id/discharge',
  authenticate,
  authorize('WARD_WRITE'),
  validate({ body: DischargePetSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hosp = await svc.discharge(
        req.params.id,
        authed(req).user.clinic_id,
        req.body,
      );
      res.json(hosp);
    } catch (err) { next(err); }
  },
);

wardRouter.post(
  '/hospitalizations/:id/care-logs',
  authenticate,
  authorize('WARD_WRITE'),
  validate({ body: AddCareLogSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await svc.addCareLog(
        req.params.id,
        authed(req).user.clinic_id,
        authed(req).user.id,
        req.body,
      );
      res.status(201).json(log);
    } catch (err) { next(err); }
  },
);
