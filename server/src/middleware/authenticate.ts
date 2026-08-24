import { Request, Response, NextFunction } from 'express';
import { isTrialExpired, type ClinicPlanType } from '@pawcare/shared';
import { verifyAccessToken } from '../lib/jwt';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    clinic_id: string;
    role: string;
    plan: ClinicPlanType;
    trial_ends_at: string | null;
    extra_features: string[];
  };
}

// Routes a locked-out trial clinic must still be able to reach — otherwise
// staff can never log out or see why they're locked out.
const TRIAL_LOCK_EXEMPT_PATHS = ['/auth/logout', '/auth/refresh'];

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const plan = payload.plan as ClinicPlanType;

    // req.path is relative to wherever this middleware runs (Express strips
    // the mount prefix inside nested routers) — req.originalUrl always keeps
    // the full path, which is what the exempt-path list is written against.
    if (
      isTrialExpired(plan, payload.trial_ends_at) &&
      !TRIAL_LOCK_EXEMPT_PATHS.some((p) => req.originalUrl.startsWith(`/api/v1${p}`))
    ) {
      res.status(403).json({
        error: {
          code: 'TRIAL_EXPIRED',
          message: 'Your free trial has ended. Contact us to upgrade and regain access.',
        },
      });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      clinic_id: payload.clinic_id,
      role: payload.role,
      plan,
      trial_ends_at: payload.trial_ends_at,
      extra_features: payload.extra_features ?? [],
    };
    next();
  } catch {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
    });
  }
}
