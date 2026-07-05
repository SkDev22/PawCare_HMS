import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let accessToken: string;
let clinicId: string;

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'Dashboard Test Clinic' } });
  clinicId = clinic.id;

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@dash.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name: 'Admin',
      role: 'ADMIN',
    },
  });

  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@dash.test', password: 'Admin@1234' });
  accessToken = res.body.accessToken as string;

  const owner = await prisma.owner.create({
    data: { clinic_id: clinicId, first_name: 'Jane', last_name: 'Doe', phone: '+1555200' },
  });
  await prisma.pet.create({ data: { owner_id: owner.id, name: 'Milo', species: 'CAT' } });
});

afterAll(async () => {
  await prisma.pet.deleteMany({ where: { owner: { clinic_id: clinicId } } });
  await prisma.owner.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('GET /api/v1/dashboard/summary', () => {
  it('returns an aggregated dashboard summary reflecting real clinic data', async () => {
    const res = await request
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.activePatients.total).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('monthlyVisits');
    expect(res.body).toHaveProperty('speciesDistribution');
    expect(res.body).toHaveProperty('todaysAppointments');
    expect(res.body).toHaveProperty('wardStatus');
    expect(res.body.alerts).toHaveProperty('lowStock');
    expect(res.body.alerts).toHaveProperty('abnormalLabResults');
  });

  it('rejects requests with no access token', async () => {
    const res = await request.get('/api/v1/dashboard/summary');
    expect(res.status).toBe(401);
  });
});
