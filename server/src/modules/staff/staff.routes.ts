import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  StaffQuerySchema,
  UpsertScheduleSchema,
} from '@pawcare/shared';
import type { StaffQueryInput } from '@pawcare/shared';
import * as svc from './staff.service';

export const staffRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ── List & Create ─────────────────────────────────────────────────────────────

staffRouter.get(
  '/',
  authenticate,
  authorize('STAFF_READ'),
  validate({ query: StaffQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listStaff(
        authed(req).user.clinic_id,
        req.query as unknown as StaffQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

staffRouter.post(
  '/',
  authenticate,
  authorize('STAFF_WRITE'),
  validate({ body: CreateStaffSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staff = await svc.createStaff(authed(req).user.clinic_id, req.body);
      res.status(201).json(staff);
    } catch (err) { next(err); }
  },
);

// ── Single staff member ───────────────────────────────────────────────────────

staffRouter.get(
  '/:id',
  authenticate,
  authorize('STAFF_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staff = await svc.getStaff(req.params.id, authed(req).user.clinic_id);
      res.json(staff);
    } catch (err) { next(err); }
  },
);

staffRouter.put(
  '/:id',
  authenticate,
  authorize('STAFF_WRITE'),
  validate({ body: UpdateStaffSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staff = await svc.updateStaff(
        req.params.id,
        authed(req).user.clinic_id,
        req.body,
      );
      res.json(staff);
    } catch (err) { next(err); }
  },
);

staffRouter.delete(
  '/:id',
  authenticate,
  authorize('STAFF_WRITE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.deactivateStaff(req.params.id, authed(req).user.clinic_id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
);

// ── Schedule ──────────────────────────────────────────────────────────────────

staffRouter.get(
  '/:id/schedule',
  authenticate,
  authorize('STAFF_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await svc.getSchedule(req.params.id, authed(req).user.clinic_id);
      res.json(schedule);
    } catch (err) { next(err); }
  },
);

staffRouter.put(
  '/:id/schedule',
  authenticate,
  authorize('STAFF_WRITE'),
  validate({ body: UpsertScheduleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await svc.upsertSchedule(
        req.params.id,
        authed(req).user.clinic_id,
        req.body,
      );
      res.json(schedule);
    } catch (err) { next(err); }
  },
);
