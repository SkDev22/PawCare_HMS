import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  LogTransactionSchema,
  InventoryQuerySchema,
  SetPreferredBatchSchema,
  isInventoryRetailOnly,
} from '@pawcare/shared';
import type { InventoryQuery } from '@pawcare/shared';
import * as svc from './inventory.service';

export const inventoryRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// True for a clinic that has Pet Shop but not the full Inventory plan
// feature — such a caller is scoped to RETAIL-category items only, rather
// than blocked outright (the composite feature gate in api/routes/index.ts
// already lets them through the door).
function retailOnly(req: Request): boolean {
  const { plan, extra_features } = authed(req).user;
  return isInventoryRetailOnly(plan, extra_features);
}

// ── Alerts (must come before /:id) ───────────────────────────────────────────

inventoryRouter.get(
  '/alerts',
  authenticate,
  authorize('INVENTORY_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alerts = await svc.getAlerts(authed(req).user.clinic_id, retailOnly(req));
      res.json(alerts);
    } catch (err) { next(err); }
  },
);

// ── List & Create ─────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/',
  authenticate,
  authorize('INVENTORY_READ'),
  validate({ query: InventoryQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listItems(
        authed(req).user.clinic_id,
        req.query as unknown as InventoryQuery,
        retailOnly(req),
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

inventoryRouter.post(
  '/',
  authenticate,
  authorize('INVENTORY_WRITE'),
  validate({ body: CreateInventoryItemSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await svc.createItem(authed(req).user.clinic_id, req.body, retailOnly(req));
      res.status(201).json(item);
    } catch (err) { next(err); }
  },
);

// ── Single item ───────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/:id',
  authenticate,
  authorize('INVENTORY_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await svc.getItem(req.params.id, authed(req).user.clinic_id, retailOnly(req));
      if (!item) return res.status(404).json({ error: { message: 'Not found' } });
      res.json(item);
    } catch (err) { next(err); }
  },
);

inventoryRouter.put(
  '/:id',
  authenticate,
  authorize('INVENTORY_WRITE'),
  validate({ body: UpdateInventoryItemSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await svc.updateItem(
        req.params.id,
        authed(req).user.clinic_id,
        req.body,
        retailOnly(req),
      );
      res.json(item);
    } catch (err) { next(err); }
  },
);

inventoryRouter.delete(
  '/:id',
  authenticate,
  authorize('INVENTORY_WRITE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.deleteItem(req.params.id, authed(req).user.clinic_id, retailOnly(req));
      res.status(204).end();
    } catch (err) { next(err); }
  },
);

// ── Batches ───────────────────────────────────────────────────────────────────

inventoryRouter.get(
  '/:id/batches',
  authenticate,
  authorize('INVENTORY_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batches = await svc.listBatches(req.params.id, authed(req).user.clinic_id, retailOnly(req));
      res.json(batches);
    } catch (err) { next(err); }
  },
);

inventoryRouter.patch(
  '/:id/preferred-batch',
  authenticate,
  authorize('INVENTORY_WRITE'),
  validate({ body: SetPreferredBatchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await svc.setPreferredBatch(
        req.params.id,
        authed(req).user.clinic_id,
        req.body.batch_id,
        retailOnly(req),
      );
      res.json(item);
    } catch (err) { next(err); }
  },
);

// ── Transactions ──────────────────────────────────────────────────────────────

inventoryRouter.post(
  '/:id/transactions',
  authenticate,
  authorize('INVENTORY_WRITE'),
  validate({ body: LogTransactionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tx = await svc.logTransaction(
        req.params.id,
        authed(req).user.clinic_id,
        authed(req).user.id,
        req.body,
        retailOnly(req),
      );
      res.status(201).json(tx);
    } catch (err) { next(err); }
  },
);

inventoryRouter.get(
  '/:id/transactions',
  authenticate,
  authorize('INVENTORY_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const limit  = req.query.limit ? Number(req.query.limit) : 20;
      const result = await svc.listTransactions(
        req.params.id,
        authed(req).user.clinic_id,
        cursor,
        limit,
        retailOnly(req),
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);
