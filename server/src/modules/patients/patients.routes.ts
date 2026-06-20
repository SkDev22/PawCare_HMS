import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  CreateOwnerSchema, UpdateOwnerSchema, OwnerQuerySchema,
  CreatePetSchema, UpdatePetSchema, PetQuerySchema, CreateAllergySchema,
} from '@pawcare/shared';
import type { OwnerQueryInput, PetQueryInput } from '@pawcare/shared';
import * as ownersService from './owners.service';
import * as petsService from './pets.service';

export const patientsRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// ─── Owners ──────────────────────────────────────────────────────────────────

patientsRouter.get(
  '/owners',
  authenticate,
  authorize('PATIENT_READ'),
  validate({ query: OwnerQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownersService.listOwners(
        authed(req).user.clinic_id,
        req.query as unknown as OwnerQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

patientsRouter.post(
  '/owners',
  authenticate,
  authorize('PATIENT_WRITE'),
  validate({ body: CreateOwnerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const owner = await ownersService.createOwner(authed(req).user.clinic_id, req.body);
      res.status(201).json(owner);
    } catch (err) { next(err); }
  },
);

patientsRouter.get(
  '/owners/:id',
  authenticate,
  authorize('PATIENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const owner = await ownersService.getOwner(req.params.id, authed(req).user.clinic_id);
      res.json(owner);
    } catch (err) { next(err); }
  },
);

patientsRouter.put(
  '/owners/:id',
  authenticate,
  authorize('PATIENT_WRITE'),
  validate({ body: UpdateOwnerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const owner = await ownersService.updateOwner(req.params.id, authed(req).user.clinic_id, req.body);
      res.json(owner);
    } catch (err) { next(err); }
  },
);

patientsRouter.delete(
  '/owners/:id',
  authenticate,
  authorize('PATIENT_WRITE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ownersService.deleteOwner(req.params.id, authed(req).user.clinic_id);
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

// ─── Pets ─────────────────────────────────────────────────────────────────────

patientsRouter.get(
  '/pets',
  authenticate,
  authorize('PATIENT_READ'),
  validate({ query: PetQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await petsService.listPets(
        authed(req).user.clinic_id,
        req.query as unknown as PetQueryInput,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

patientsRouter.post(
  '/pets',
  authenticate,
  authorize('PATIENT_WRITE'),
  validate({ body: CreatePetSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pet = await petsService.createPet(authed(req).user.clinic_id, req.body);
      res.status(201).json(pet);
    } catch (err) { next(err); }
  },
);

patientsRouter.get(
  '/pets/:id',
  authenticate,
  authorize('PATIENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pet = await petsService.getPet(req.params.id, authed(req).user.clinic_id);
      res.json(pet);
    } catch (err) { next(err); }
  },
);

patientsRouter.put(
  '/pets/:id',
  authenticate,
  authorize('PATIENT_WRITE'),
  validate({ body: UpdatePetSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pet = await petsService.updatePet(req.params.id, authed(req).user.clinic_id, req.body);
      res.json(pet);
    } catch (err) { next(err); }
  },
);

patientsRouter.get(
  '/pets/:id/history',
  authenticate,
  authorize('PATIENT_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await petsService.getPetHistory(req.params.id, authed(req).user.clinic_id);
      res.json(history);
    } catch (err) { next(err); }
  },
);

patientsRouter.post(
  '/pets/:id/allergies',
  authenticate,
  authorize('PATIENT_WRITE'),
  validate({ body: CreateAllergySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allergy = await petsService.addAllergy(req.params.id, authed(req).user.clinic_id, req.body);
      res.status(201).json(allergy);
    } catch (err) { next(err); }
  },
);
