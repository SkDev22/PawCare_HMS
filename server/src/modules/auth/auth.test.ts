import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

describe('Auth — POST /api/v1/auth/login', () => {
  let clinicId: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({
      data: { name: 'Test Clinic' },
    });
    clinicId = clinic.id;

    await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: 'vet@test.pawcare',
        password_hash: await bcrypt.hash('Secure@123', 12),
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'VETERINARIAN',
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  it('returns 200 with accessToken and sets refresh cookie on valid credentials', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'vet@test.pawcare', password: 'Secure@123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.staff.email).toBe('vet@test.pawcare');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'vet@test.pawcare', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 on unknown email', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.pawcare', password: 'Secure@123' });

    expect(res.status).toBe(401);
  });

  it('returns 422 on invalid email format', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Secure@123' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when password is too short', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'vet@test.pawcare', password: 'short' });

    expect(res.status).toBe(422);
  });
});

describe('Auth — POST /api/v1/auth/refresh', () => {
  let clinicId: string;
  let refreshCookie: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({
      data: { name: 'Test Clinic — Refresh' },
    });
    clinicId = clinic.id;

    await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: 'vet-refresh@test.pawcare',
        password_hash: await bcrypt.hash('Secure@123', 12),
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'VETERINARIAN',
      },
    });

    // Log in to get the cookie
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'vet-refresh@test.pawcare', password: 'Secure@123' });

    // Extract Set-Cookie header
    const cookies = res.headers['set-cookie'] as string[] | string;
    refreshCookie = Array.isArray(cookies) ? cookies[0] : cookies;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  it('returns a new accessToken with valid refresh cookie', async () => {
    const res = await request
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.staff).toMatchObject({ email: 'vet-refresh@test.pawcare' });
  });

  it('returns 401 without cookie', async () => {
    const res = await request.post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('Auth — POST /api/v1/auth/sessions/revoke-others', () => {
  let clinicId: string;
  let accessTokenA: string;
  let cookieA: string;
  let cookieB: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({
      data: { name: 'Test Clinic — Sessions' },
    });
    clinicId = clinic.id;

    await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: 'vet-sessions@test.pawcare',
        password_hash: await bcrypt.hash('Secure@123', 12),
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'VETERINARIAN',
      },
    });

    // Two separate "device" logins for the same account
    const loginA = await request
      .post('/api/v1/auth/login')
      .send({ email: 'vet-sessions@test.pawcare', password: 'Secure@123' });
    accessTokenA = loginA.body.accessToken;
    const cookiesA = loginA.headers['set-cookie'] as string[] | string;
    cookieA = Array.isArray(cookiesA) ? cookiesA[0] : cookiesA;

    const loginB = await request
      .post('/api/v1/auth/login')
      .send({ email: 'vet-sessions@test.pawcare', password: 'Secure@123' });
    const cookiesB = loginB.headers['set-cookie'] as string[] | string;
    cookieB = Array.isArray(cookiesB) ? cookiesB[0] : cookiesB;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  it('revokes other sessions but keeps the calling session alive', async () => {
    const res = await request
      .post('/api/v1/auth/sessions/revoke-others')
      .set('Cookie', cookieA)
      .set('Authorization', `Bearer ${accessTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.revokedCount).toBe(1);

    // Session A's refresh cookie still works
    const stillWorks = await request.post('/api/v1/auth/refresh').set('Cookie', cookieA);
    expect(stillWorks.status).toBe(200);

    // Session B's refresh cookie was revoked
    const revoked = await request.post('/api/v1/auth/refresh').set('Cookie', cookieB);
    expect(revoked.status).toBe(401);
  });

  it('returns 401 without an access token', async () => {
    const res = await request.post('/api/v1/auth/sessions/revoke-others').set('Cookie', cookieA);
    expect(res.status).toBe(401);
  });
});
