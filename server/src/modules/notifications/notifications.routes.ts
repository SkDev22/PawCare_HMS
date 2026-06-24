import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { NotificationQuerySchema } from '@pawcare/shared';
import type { NotificationQuery } from '@pawcare/shared';
import * as svc from './notifications.service';

export const notificationsRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// GET /notifications/unread-count — must come before /:id
notificationsRouter.get(
  '/unread-count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await svc.getUnreadCount(authed(req).user.id);
      res.json(data);
    } catch (err) { next(err); }
  },
);

// PATCH /notifications/read-all — must come before /:id
notificationsRouter.patch(
  '/read-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await svc.markAllRead(authed(req).user.id);
      res.json(data);
    } catch (err) { next(err); }
  },
);

notificationsRouter.get(
  '/',
  authenticate,
  validate({ query: NotificationQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.listNotifications(
        authed(req).user.id,
        req.query as unknown as NotificationQuery,
      );
      res.json(result);
    } catch (err) { next(err); }
  },
);

notificationsRouter.patch(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notif = await svc.markRead(req.params.id, authed(req).user.id);
      res.json(notif);
    } catch (err) { next(err); }
  },
);
