import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

describe('Clinic — GET/PUT /api/v1/clinic', () => {
  let clinicId: string;
  let adminToken: string;
  let nurseToken: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({
      data: { name: 'Test Clinic — Profile', address: '1 Old Road' },
    });
    clinicId = clinic.id;

    await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: 'admin-clinic@test.pawcare',
        password_hash: await bcrypt.hash('Secure@123', 12),
        first_name: 'Ada',
        last_name: 'Admin',
        role: 'ADMIN',
      },
    });
    await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: 'nurse-clinic@test.pawcare',
        password_hash: await bcrypt.hash('Secure@123', 12),
        first_name: 'Nora',
        last_name: 'Nurse',
        role: 'NURSE',
      },
    });

    const adminLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin-clinic@test.pawcare', password: 'Secure@123' });
    adminToken = adminLogin.body.accessToken;

    const nurseLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: 'nurse-clinic@test.pawcare', password: 'Secure@123' });
    nurseToken = nurseLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.clinicHours.deleteMany({ where: { clinic_id: clinicId } });
    await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
    await prisma.$disconnect();
  });

  it('lets an admin read their own clinic profile', async () => {
    const res = await request
      .get('/api/v1/clinic')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(clinicId);
    expect(res.body.name).toBe('Test Clinic — Profile');
    expect(res.body.address).toBe('1 Old Road');
  });

  it('lets an admin update clinic contact details', async () => {
    const res = await request
      .put('/api/v1/clinic')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '+1-555-0199', address: '2 New Road' });

    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+1-555-0199');
    expect(res.body.address).toBe('2 New Road');
    expect(res.body.name).toBe('Test Clinic — Profile');
  });

  it('lets a non-admin read the clinic profile (needed for print letterheads) but not write it', async () => {
    const getRes = await request
      .get('/api/v1/clinic')
      .set('Authorization', `Bearer ${nurseToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Test Clinic — Profile');

    const putRes = await request
      .put('/api/v1/clinic')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({ name: 'Hijacked Name' });
    expect(putRes.status).toBe(403);
  });

  it('updates invoicing settings (tax rate, prefix, due days, footer text)', async () => {
    const res = await request
      .put('/api/v1/clinic')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tax_rate: 7.5,
        invoice_prefix: 'ACME-',
        invoice_due_days: 30,
        invoice_footer_text: 'Thanks for visiting!',
      });

    expect(res.status).toBe(200);
    expect(res.body.tax_rate).toBe('7.50');
    expect(res.body.invoice_prefix).toBe('ACME-');
    expect(res.body.invoice_due_days).toBe(30);
    expect(res.body.invoice_footer_text).toBe('Thanks for visiting!');
  });

  it('lets an admin set and any staff read business hours, but only an admin can write them', async () => {
    const putRes = await request
      .put('/api/v1/clinic/hours')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        entries: [
          { day_of_week: 0, is_closed: true },
          { day_of_week: 1, is_closed: false, open_time: '09:00', close_time: '17:00' },
        ],
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body).toHaveLength(2);

    const getRes = await request
      .get('/api/v1/clinic/hours')
      .set('Authorization', `Bearer ${nurseToken}`);
    expect(getRes.status).toBe(200);
    const sunday = getRes.body.find((h: { day_of_week: number }) => h.day_of_week === 0);
    const monday = getRes.body.find((h: { day_of_week: number }) => h.day_of_week === 1);
    expect(sunday.is_closed).toBe(true);
    expect(monday.open_time).toBe('09:00');

    const forbidden = await request
      .put('/api/v1/clinic/hours')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({ entries: [] });
    expect(forbidden.status).toBe(403);
  });
});
