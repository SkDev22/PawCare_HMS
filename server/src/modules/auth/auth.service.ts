import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../lib/jwt';
import { AppError } from '../../lib/errors';

const REFRESH_TOKEN_BYTES = 64;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateRawToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}

export async function login(email: string, password: string) {
  const staff = await prisma.staffUser.findFirst({
    where: { email, deleted_at: null, is_active: true },
  });

  // Perform comparison even on missing user to prevent timing attacks
  const passwordToCheck = staff?.password_hash ?? '$2b$12$invalidhashtopreventtimingattack';
  const valid = await bcrypt.compare(password, passwordToCheck);

  if (!staff || !valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const accessToken = signAccessToken({
    sub: staff.id,
    clinic_id: staff.clinic_id,
    role: staff.role,
  });

  const rawRefreshToken = generateRawToken();

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        staff_id: staff.id,
        token_hash: hashToken(rawRefreshToken),
        expires_at: refreshTokenExpiry(),
      },
    }),
    prisma.staffUser.update({
      where: { id: staff.id },
      data: { last_login_at: new Date() },
    }),
  ]);

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    staff: {
      id: staff.id,
      email: staff.email,
      first_name: staff.first_name,
      last_name: staff.last_name,
      role: staff.role,
      clinic_id: staff.clinic_id,
      ...(staff.avatar_url ? { avatar_url: staff.avatar_url } : {}),
    },
  };
}

export async function refresh(rawRefreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token_hash: hashToken(rawRefreshToken) },
    include: { staff: { select: { id: true, clinic_id: true, role: true, is_active: true, deleted_at: true } } },
  });

  if (!stored || stored.revoked_at !== null || stored.expires_at < new Date()) {
    throw new AppError('INVALID_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  if (!stored.staff.is_active || stored.staff.deleted_at !== null) {
    throw new AppError('ACCOUNT_INACTIVE', 'Account is inactive', 401);
  }

  const accessToken = signAccessToken({
    sub: stored.staff.id,
    clinic_id: stored.staff.clinic_id,
    role: stored.staff.role,
  });

  return { accessToken };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token_hash: hashToken(rawRefreshToken), revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

export async function revokeAllTokens(staffId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { staff_id: staffId, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}
