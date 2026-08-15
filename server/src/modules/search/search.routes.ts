import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { SearchQuerySchema } from '@pawcare/shared';
import type { SearchQueryInput } from '@pawcare/shared';
import * as searchService from './search.service';

export const searchRouter: IRouter = Router();

function authed(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

// No single authorize() here: every staff role may use global search, but
// search.service scopes each result category to its own read permission,
// so a role only ever sees the categories it could already view directly.
searchRouter.get(
  '/',
  authenticate,
  validate({ query: SearchQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit } = req.query as unknown as SearchQueryInput;
      const { clinic_id, role } = authed(req).user;
      const groups = await searchService.globalSearch(clinic_id, role, q, limit);
      res.json({ query: q, groups });
    } catch (err) { next(err); }
  },
);
