import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
    include: { clinic: { select: { plan: true, trial_ends_at: true, extra_features: true } } },
  });

  // Perform comparison even on missing user to prevent timing attacks
  const passwordToCheck = staff?.password_hash ?? '$2b$12$invalidhashtopreventtimingattack';
  const valid = await bcrypt.compare(password, passwordToCheck);

  if (!staff || !valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const trialEndsAt = staff.clinic.trial_ends_at?.toISOString() ?? null;

  const accessToken = signAccessToken({
    sub: staff.id,
    clinic_id: staff.clinic_id,
    role: staff.role,
    plan: staff.clinic.plan,
    trial_ends_at: trialEndsAt,
    extra_features: staff.clinic.extra_features,
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
      plan: staff.clinic.plan,
      trial_ends_at: trialEndsAt,
      extra_features: staff.clinic.extra_features,
      ...(staff.avatar_url ? { avatar_url: staff.avatar_url } : {}),
      ...(staff.phone ? { phone: staff.phone } : {}),
      ...(staff.specialization ? { specialization: staff.specialization } : {}),
      ...(staff.license_number ? { license_number: staff.license_number } : {}),
    },
  };
}

export async function refresh(rawRefreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token_hash: hashToken(rawRefreshToken) },
    include: {
      staff: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          clinic_id: true,
          avatar_url: true,
          phone: true,
          specialization: true,
          license_number: true,
          is_active: true,
          deleted_at: true,
          clinic: { select: { plan: true, trial_ends_at: true, extra_features: true } },
        },
      },
    },
  });

  if (!stored || stored.revoked_at !== null || stored.expires_at < new Date()) {
    throw new AppError('INVALID_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  if (!stored.staff.is_active || stored.staff.deleted_at !== null) {
    throw new AppError('ACCOUNT_INACTIVE', 'Account is inactive', 401);
  }

  const trialEndsAt = stored.staff.clinic.trial_ends_at?.toISOString() ?? null;

  const accessToken = signAccessToken({
    sub: stored.staff.id,
    clinic_id: stored.staff.clinic_id,
    role: stored.staff.role,
    plan: stored.staff.clinic.plan,
    trial_ends_at: trialEndsAt,
    extra_features: stored.staff.clinic.extra_features,
  });

  return {
    accessToken,
    staff: {
      id: stored.staff.id,
      email: stored.staff.email,
      first_name: stored.staff.first_name,
      last_name: stored.staff.last_name,
      role: stored.staff.role,
      clinic_id: stored.staff.clinic_id,
      plan: stored.staff.clinic.plan,
      trial_ends_at: trialEndsAt,
      extra_features: stored.staff.clinic.extra_features,
      ...(stored.staff.avatar_url ? { avatar_url: stored.staff.avatar_url } : {}),
      ...(stored.staff.phone ? { phone: stored.staff.phone } : {}),
      ...(stored.staff.specialization ? { specialization: stored.staff.specialization } : {}),
      ...(stored.staff.license_number ? { license_number: stored.staff.license_number } : {}),
    },
  };
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

// Revokes every active session except the one presenting `currentRawToken`,
// so a "sign out of all other devices" action doesn't also log the caller out.
export async function revokeOtherTokens(staffId: string, currentRawToken: string): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: {
      staff_id: staffId,
      revoked_at: null,
      token_hash: { not: hashToken(currentRawToken) },
    },
    data: { revoked_at: new Date() },
  });
  return result.count;
}

export async function changePassword(
  staffId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const staff = await prisma.staffUser.findUnique({ where: { id: staffId } });

  if (!staff) {
    throw new AppError('NOT_FOUND', 'Staff account not found', 404);
  }

  const valid = await bcrypt.compare(currentPassword, staff.password_hash);
  if (!valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 401);
  }

  const password_hash = await bcrypt.hash(newPassword, 12);

  await prisma.staffUser.update({
    where: { id: staffId },
    data: { password_hash },
  });

  // All sessions (this one included) must re-authenticate with the new password
  await revokeAllTokens(staffId);
}
