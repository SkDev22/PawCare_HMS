import { Request, Response, NextFunction } from 'express';
import { clinicHasFeature, type FeatureKey } from '@pawcare/shared';
import { AuthenticatedRequest } from './authenticate';

// Gates a route by the calling clinic's plan (ADR-04), independent of the
// caller's role — authorize() answers "can this role do this", authorizeFeature()
// answers "does this clinic's plan include this module at all". Derived from
// the JWT's `plan` claim, so no extra DB query per request.
export function authorizeFeature(...requiredFeatures: FeatureKey[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { plan, extra_features } = (req as AuthenticatedRequest).user;

    const allowed = requiredFeatures.every((feature) => clinicHasFeature(plan, feature, extra_features));

    if (!allowed) {
      res.status(403).json({
        error: { code: 'FEATURE_NOT_ENABLED', message: 'This feature is not included in your plan' },
      });
      return;
    }

    next();
  };
}
