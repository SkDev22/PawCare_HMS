import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  UpdateAppointmentStatusSchema,
  AppointmentQuerySchema,
  CreateRoomSchema,
} from '@pawcare/shared';
import type { AppointmentQueryInput } from '@pawcare/shared';
import * as svc from './appointments.service';

export const appointmentsRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ─── Vets list (for dropdowns) ────────────────────────────────────────────────

appointmentsRouter.get(
  '/vets',
  authenticate,
  authorize('APPOINTMENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vets = await svc.listVets(authed(req).user.clinic_id);
      res.json(vets);
    } catch (err) { next(err); }
  },
);

// ─── Rooms ────────────────────────────────────────────────────────────────────

appointmentsRouter.get(
  '/rooms',
  authenticate,
  authorize('APPOINTMENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rooms = await svc.listRooms(authed(req).user.clinic_id);
      res.json(rooms);
    } catch (err) { next(err); }
  },
);

appointmentsRouter.post(
  '/rooms',
  authenticate,
  authorize('APPOINTMENT_WRITE'),
  validate({ body: CreateRoomSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const room = await svc.createRoom(authed(req).user.clinic_id, req.body);
      res.status(201).json(room);
    } catch (err) { next(err); }
  },
);

// ─── Queue (FCFS front-desk view) ────────────────────────────────────────────

appointmentsRouter.get(
  '/queue',
  authenticate,
  authorize('APPOINTMENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);
      const queue = await svc.getQueue(authed(req).user.clinic_id, date);
      res.json(queue);
    } catch (err) { next(err); }
  },
);

// ─── Calendar view ────────────────────────────────────────────────────────────

appointmentsRouter.get(
  '/calendar',
  authenticate,
  authorize('APPOINTMENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);
      const appointments = await svc.getCalendarView(authed(req).user.clinic_id, date);
      res.json(appointments);
    } catch (err) { next(err); }
  },
);

// ─── Appointments list & create ───────────────────────────────────────────────

appointmentsRouter.get(
  '/',
  authenticate,
  authorize('APPOINTMENT_READ'),
  validate({ query: AppointmentQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listAppointments(
        authed(req).user.clinic_id,
        req.query as unknown as AppointmentQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

appointmentsRouter.post(
  '/',
  authenticate,
  authorize('APPOINTMENT_WRITE'),
  validate({ body: CreateAppointmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appt = await svc.createAppointment(authed(req).user.clinic_id, req.body);
      res.status(201).json(appt);
    } catch (err) { next(err); }
  },
);

// ─── Single appointment ───────────────────────────────────────────────────────

appointmentsRouter.get(
  '/:id',
  authenticate,
  authorize('APPOINTMENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appt = await svc.getAppointment(req.params.id, authed(req).user.clinic_id);
      res.json(appt);
    } catch (err) { next(err); }
  },
);

appointmentsRouter.put(
  '/:id',
  authenticate,
  authorize('APPOINTMENT_WRITE'),
  validate({ body: UpdateAppointmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appt = await svc.updateAppointment(req.params.id, authed(req).user.clinic_id, req.body);
      res.json(appt);
    } catch (err) { next(err); }
  },
);

appointmentsRouter.patch(
  '/:id/status',
  authenticate,
  authorize('APPOINTMENT_WRITE'),
  validate({ body: UpdateAppointmentStatusSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.updateStatus(req.params.id, authed(req).user.clinic_id, req.body);
      res.json(result);
    } catch (err) { next(err); }
  },
);

appointmentsRouter.delete(
  '/:id',
  authenticate,
  authorize('APPOINTMENT_CANCEL'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cancel_reason } = req.body as { cancel_reason?: string };
      await svc.updateStatus(req.params.id, authed(req).user.clinic_id, {
        status: 'CANCELLED',
        cancel_reason: cancel_reason ?? 'Cancelled by staff',
      });
      res.status(204).send();
    } catch (err) { next(err); }
  },
);
