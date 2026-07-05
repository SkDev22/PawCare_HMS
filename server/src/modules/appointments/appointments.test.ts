import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let accessToken: string;
let clinicId: string;
let vetId: string;
let petId: string;

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'Appointments Test Clinic' } });
  clinicId = clinic.id;

  const admin = await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@appt.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name: 'Admin',
      role: 'ADMIN',
    },
  });
  vetId = admin.id;

  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@appt.test', password: 'Admin@1234' });
  accessToken = res.body.accessToken as string;

  const owner = await prisma.owner.create({
    data: { clinic_id: clinicId, first_name: 'Walkin', last_name: 'Owner', phone: '+1555100' },
  });
  const pet = await prisma.pet.create({
    data: { owner_id: owner.id, name: 'Rex', species: 'DOG' },
  });
  petId = pet.id;
});

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.pet.deleteMany({ where: { owner: { clinic_id: clinicId } } });
  await prisma.owner.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('Walk-in appointments', () => {
  it('creates a walk-in without start_at/end_at, defaulting a 30min slot', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, vet_id: vetId, type: 'SICK_VISIT', is_walk_in: true });

    expect(res.status).toBe(201);
    expect(res.body.is_walk_in).toBe(true);
    expect(res.body.start_at).toBeTruthy();
    expect(res.body.end_at).toBeTruthy();
    const durationMs = new Date(res.body.end_at).getTime() - new Date(res.body.start_at).getTime();
    expect(durationMs).toBe(30 * 60 * 1000);
  });

  it('still requires start_at/end_at for a non-walk-in booking', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, vet_id: vetId, type: 'WELLNESS_EXAM' });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/appointments/queue', () => {
  it('orders checked-in appointments by check-in time, not creation time', async () => {
    const first = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, vet_id: vetId, type: 'SICK_VISIT', is_walk_in: true });
    const second = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, vet_id: vetId, type: 'SICK_VISIT', is_walk_in: true });

    // Check in the second-created appointment first — it should come first in the queue.
    await request
      .patch(`/api/v1/appointments/${second.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CHECKED_IN' });
    await request
      .patch(`/api/v1/appointments/${first.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CHECKED_IN' });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request
      .get(`/api/v1/appointments/queue?date=${today}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const ids: string[] = res.body.map((a: { id: string }) => a.id);
    expect(ids.indexOf(second.body.id)).toBeLessThan(ids.indexOf(first.body.id));
  });
});
