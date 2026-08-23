import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

describe('Staff — PUT /api/v1/staff/me', () => {
  let clinicId: string;
  let staffId: string;
  let accessToken: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({
      data: { name: 'Test Clinic — Profile' },
    });
    clinicId = clinic.id;

    const staff = await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: 'nurse-profile@test.pawcare',
        password_hash: await bcrypt.hash('Secure@123', 12),
        first_name: 'Alex',
        last_name: 'Rivera',
        role: 'NURSE',
      },
    });
    staffId = staff.id;

    const login = await request
      .post('/api/v1/auth/login')
      .send({ email: 'nurse-profile@test.pawcare', password: 'Secure@123' });
    accessToken = login.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  it('lets a non-admin update their own name and phone', async () => {
    const res = await request
      .put('/api/v1/staff/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ first_name: 'Alexandra', phone: '+1-555-0100' });

    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('Alexandra');
    expect(res.body.phone).toBe('+1-555-0100');
    expect(res.body.last_name).toBe('Rivera');
  });

  it('ignores privileged fields like role and email', async () => {
    const res = await request
      .put('/api/v1/staff/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'ADMIN', email: 'hijacked@test.pawcare', first_name: 'Alexandra' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('NURSE');
    expect(res.body.email).toBe('nurse-profile@test.pawcare');

    const staff = await prisma.staffUser.findUnique({ where: { id: staffId } });
    expect(staff?.role).toBe('NURSE');
    expect(staff?.email).toBe('nurse-profile@test.pawcare');
  });

  it('returns 401 without an access token', async () => {
    const res = await request.put('/api/v1/staff/me').send({ first_name: 'Nope' });
    expect(res.status).toBe(401);
  });

  it('returns 422 on an invalid field value', async () => {
    const res = await request
      .put('/api/v1/staff/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ first_name: '' });

    expect(res.status).toBe(422);
  });
});
