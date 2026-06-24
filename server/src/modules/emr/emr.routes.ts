import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  CreateMedicalRecordSchema,
  UpdateMedicalRecordSchema,
  MedicalRecordQuerySchema,
  UpsertSoapNoteSchema,
  UpsertVitalsSchema,
  CreateDiagnosisSchema,
  CreatePrescriptionSchema,
  UpdatePrescriptionSchema,
} from '@pawcare/shared';
import type { MedicalRecordQueryInput } from '@pawcare/shared';
import * as svc from './emr.service';

export const emrRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ── List & Create ──────────────────────────────────────────────────────────────

emrRouter.get(
  '/',
  authenticate,
  authorize('MEDICAL_RECORD_READ'),
  validate({ query: MedicalRecordQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listRecords(
        authed(req).user.clinic_id,
        req.query as unknown as MedicalRecordQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

emrRouter.post(
  '/',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  validate({ body: CreateMedicalRecordSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = authed(req).user;
      const record = await svc.createRecord(user.clinic_id, user.id, req.body);
      res.status(201).json(record);
    } catch (err) { next(err); }
  },
);

// ── Single Record ──────────────────────────────────────────────────────────────

emrRouter.get(
  '/:id',
  authenticate,
  authorize('MEDICAL_RECORD_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await svc.getRecord(req.params.id, authed(req).user.clinic_id);
      res.json(record);
    } catch (err) { next(err); }
  },
);

emrRouter.put(
  '/:id',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  validate({ body: UpdateMedicalRecordSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await svc.updateRecord(req.params.id, authed(req).user.clinic_id, req.body);
      res.json(record);
    } catch (err) { next(err); }
  },
);

// ── SOAP Note ──────────────────────────────────────────────────────────────────

emrRouter.put(
  '/:id/soap',
  authenticate,
  authorize('SOAP_NOTE_WRITE'),
  validate({ body: UpsertSoapNoteSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = authed(req).user;
      const note = await svc.upsertSoapNote(req.params.id, user.clinic_id, user.id, req.body);
      res.json(note);
    } catch (err) { next(err); }
  },
);

// ── Vitals ─────────────────────────────────────────────────────────────────────

emrRouter.put(
  '/:id/vitals',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  validate({ body: UpsertVitalsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vitals = await svc.upsertVitals(req.params.id, authed(req).user.clinic_id, req.body);
      res.json(vitals);
    } catch (err) { next(err); }
  },
);

// ── Diagnoses ──────────────────────────────────────────────────────────────────

emrRouter.post(
  '/:id/diagnoses',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  validate({ body: CreateDiagnosisSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dx = await svc.addDiagnosis(req.params.id, authed(req).user.clinic_id, req.body);
      res.status(201).json(dx);
    } catch (err) { next(err); }
  },
);

emrRouter.delete(
  '/:id/diagnoses/:diagId',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.removeDiagnosis(req.params.id, req.params.diagId, authed(req).user.clinic_id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
);

// ── Prescriptions ──────────────────────────────────────────────────────────────

emrRouter.post(
  '/:id/prescriptions',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  validate({ body: CreatePrescriptionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = authed(req).user;
      const rx = await svc.addPrescription(req.params.id, user.clinic_id, user.id, req.body);
      res.status(201).json(rx);
    } catch (err) { next(err); }
  },
);

emrRouter.put(
  '/:id/prescriptions/:rxId',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  validate({ body: UpdatePrescriptionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rx = await svc.updatePrescription(req.params.rxId, authed(req).user.clinic_id, req.body);
      res.json(rx);
    } catch (err) { next(err); }
  },
);

emrRouter.delete(
  '/:id/prescriptions/:rxId',
  authenticate,
  authorize('MEDICAL_RECORD_WRITE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.deactivatePrescription(req.params.rxId, authed(req).user.clinic_id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
);
