import { Router, IRouter, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { asyncHandler } from '../../lib/async-handler';
import {
  LoginSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@pawcare/shared';
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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many reset requests. Try again in 15 minutes.' },
  },
});

export const authRouter: IRouter = Router();

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

    const { accessToken, staff } = await authService.refresh(rawToken);
    res.status(200).json({ accessToken, staff });
  }),
);

authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(ForgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as ForgotPasswordInput;
    await authService.requestPasswordReset(email);

    // Always the same response, whether or not the email matched an
    // account — this is what makes the endpoint enumeration-safe.
    res.status(200).json({
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  }),
);

authRouter.post(
  '/reset-password',
  validate(ResetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as ResetPasswordInput;
    await authService.resetPassword(token, newPassword);
    res.status(204).end();
  }),
);

authRouter.post(
  '/sessions/revoke-others',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies[REFRESH_COOKIE] as string | undefined;

    if (!rawToken) {
      res.status(401).json({
        error: { code: 'NO_TOKEN', message: 'Refresh token not found' },
      });
      return;
    }

    const { id } = (req as AuthenticatedRequest).user;
    const revokedCount = await authService.revokeOtherTokens(id, rawToken);
    res.status(200).json({ revokedCount });
  }),
);

authRouter.post(
  '/change-password',
  authenticate,
  validate(ChangePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    const { id } = (req as AuthenticatedRequest).user;

    await authService.changePassword(id, currentPassword, newPassword);

    // Password change revoked every refresh token, including this session's —
    // clear the now-invalid cookie so the client doesn't keep sending it.
    res.clearCookie(REFRESH_COOKIE);
    res.status(204).end();
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
