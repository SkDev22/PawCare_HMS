import { Request, Response, NextFunction } from 'express';
import { clinicHasFeature, type FeatureKey } from '@pawcare/shared';
import { AuthenticatedRequest } from './authenticate';

export interface AuthorizeFeatureOptions {
  // A downgraded clinic keeps its old rows (nothing is deleted on a plan
  // change) — but by default this middleware blocks the whole router, so
  // that data becomes invisible too, not just un-addable-to. Set this for
  // modules that hold a clinic's own historical business data (inventory
  // catalog, ward/hospitalization records) so GET/HEAD requests still work
  // without the feature; only creating/mutating stays gated. Leave unset for
  // modules with no "old data" of their own to preserve access to — e.g.
  // Reports is 100% computed reads, so letting GET through would just give
  // the feature away for free.
  allowReadWithoutFeature?: boolean;
  // Mount-relative path patterns (matched against req.path) that stay
  // reachable regardless of plan or method — for actions that must be
  // finishable on a record created while the feature was still enabled, so a
  // downgrade can't strand it (e.g. discharging an already-admitted patient
  // to free their kennel, even once the clinic no longer has WARD).
  exemptPaths?: RegExp[];
}

// Gates a route by the calling clinic's plan (ADR-04), independent of the
// caller's role — authorize() answers "can this role do this", authorizeFeature()
// answers "does this clinic's plan include this module at all". Derived from
// the JWT's `plan` claim, so no extra DB query per request.
export function authorizeFeature(feature: FeatureKey, options: AuthorizeFeatureOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.allowReadWithoutFeature && (req.method === 'GET' || req.method === 'HEAD')) {
      next();
      return;
    }

    if (options.exemptPaths?.some((pattern) => pattern.test(req.path))) {
      next();
      return;
    }

    const { plan, extra_features } = (req as AuthenticatedRequest).user;

    if (!clinicHasFeature(plan, feature, extra_features)) {
      res.status(403).json({
        error: { code: 'FEATURE_NOT_ENABLED', message: 'This feature is not included in your plan' },
      });
      return;
    }

    next();
  };
}
