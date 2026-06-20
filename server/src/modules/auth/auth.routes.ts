import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../lib/async-handler';
import { LoginSchema } from '@pawcare/shared';
import * as authService from './auth.service';

const REFRESH_COOKIE = 'refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' },
  },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  validate(LoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);

    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);

    res.status(200).json({
      accessToken: result.accessToken,
      staff: result.staff,
    });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies[REFRESH_COOKIE] as string | undefined;

    if (!rawToken) {
      res.status(401).json({
        error: { code: 'NO_TOKEN', message: 'Refresh token not found' },
      });
      return;
    }

    const { accessToken } = await authService.refresh(rawToken);
    res.status(200).json({ accessToken });
  }),
);

authRouter.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies[REFRESH_COOKIE] as string | undefined;

    if (rawToken) {
      await authService.logout(rawToken);
    }

    res.clearCookie(REFRESH_COOKIE);
    res.status(204).end();
  }),
);
