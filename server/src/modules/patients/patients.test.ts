import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let accessToken: string;
let clinicId: string;

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'Patient Test Clinic' } });
  clinicId = clinic.id;

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@patient.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name:  'Admin',
      role: 'ADMIN',
    },
  });

  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@patient.test', password: 'Admin@1234' });

  accessToken = res.body.accessToken as string;
});

afterAll(async () => {
  await prisma.allergy.deleteMany({ where: { pet: { owner: { clinic_id: clinicId } } } });
  await prisma.pet.deleteMany({ where: { owner: { clinic_id: clinicId } } });
  await prisma.owner.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

// ─── Owners ───────────────────────────────────────────────────────────────────

describe('Owners — POST /api/v1/owners', () => {
  it('creates an owner and returns 201', async () => {
    const res = await request
      .post('/api/v1/owners')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        first_name: 'Jane',
        last_name:  'Smith',
        phone:      '+1-555-0101',
        email:      'jane.smith@example.com',
        preferred_contact: 'email',
      });

    expect(res.status).toBe(201);
    expect(res.body.first_name).toBe('Jane');
    expect(res.body.clinic_id).toBe(clinicId);
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request
      .post('/api/v1/owners')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ first_name: 'Dup', last_name: 'User', phone: '+155500002', email: 'jane.smith@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 422 if phone is missing', async () => {
    const res = await request
      .post('/api/v1/owners')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ first_name: 'No', last_name: 'Phone', email: 'nophone@example.com' });

    expect(res.status).toBe(422);
  });

  it('returns 401 without token', async () => {
    const res = await request.post('/api/v1/owners').send({ first_name: 'A', last_name: 'B', phone: '123' });
    expect(res.status).toBe(401);
  });
});

describe('Owners — GET /api/v1/owners', () => {
  it('lists owners with pagination metadata', async () => {
    const res = await request
      .get('/api/v1/owners')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.hasMore).toBe('boolean');
  });

  it('supports search', async () => {
    const res = await request
      .get('/api/v1/owners?search=Jane')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.some((o: { first_name: string }) => o.first_name === 'Jane')).toBe(true);
  });
});

// ─── Pets ─────────────────────────────────────────────────────────────────────

describe('Pets — POST /api/v1/pets', () => {
  let ownerId: string;

  beforeAll(async () => {
    const owner = await prisma.owner.create({
      data: { clinic_id: clinicId, first_name: 'Bob', last_name: 'Jones', phone: '+1555002' },
    });
    ownerId = owner.id;
  });

  it('creates a pet and returns 201', async () => {
    const res = await request
      .post('/api/v1/pets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ owner_id: ownerId, name: 'Buddy', species: 'DOG', breed: 'Labrador', sex: 'M' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Buddy');
    expect(res.body.owner_id).toBe(ownerId);
  });

  it('returns 422 for invalid species', async () => {
    const res = await request
      .post('/api/v1/pets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ owner_id: ownerId, name: 'X', species: 'UNICORN' });

    expect(res.status).toBe(422);
  });

  it('returns 404 for unknown owner', async () => {
    const res = await request
      .post('/api/v1/pets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ owner_id: '00000000-0000-0000-0000-000000000000', name: 'X', species: 'CAT' });

    expect(res.status).toBe(404);
  });
});

describe('Pets — GET /api/v1/pets', () => {
  it('lists pets', async () => {
    const res = await request
      .get('/api/v1/pets')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('filters by species', async () => {
    const res = await request
      .get('/api/v1/pets?species=DOG')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    res.body.items.forEach((p: { species: string }) => {
      expect(p.species).toBe('DOG');
    });
  });
});
