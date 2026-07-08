import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let clinicId: string;
let adminToken: string;
let receptionistToken: string;
let roomId: string;

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'Ward Test Clinic' } });
  clinicId = clinic.id;

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@wardtest.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name: 'Admin',
      role: 'ADMIN',
    },
  });

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'reception@wardtest.test',
      password_hash: await bcrypt.hash('Reception@1234', 12),
      first_name: 'Test',
      last_name: 'Receptionist',
      role: 'RECEPTIONIST',
    },
  });

  const adminLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@wardtest.test', password: 'Admin@1234' });
  adminToken = adminLogin.body.accessToken as string;

  const receptionLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: 'reception@wardtest.test', password: 'Reception@1234' });
  receptionistToken = receptionLogin.body.accessToken as string;

  const room = await prisma.room.create({
    data: { clinic_id: clinicId, name: 'Ward Test Room', type: 'ward' },
  });
  roomId = room.id;
});

afterAll(async () => {
  await prisma.kennelUnit.deleteMany({ where: { room: { clinic_id: clinicId } } });
  await prisma.room.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('POST /api/v1/ward/kennels', () => {
  it('creates a kennel in a room belonging to the clinic', async () => {
    const res = await request
      .post('/api/v1/ward/kennels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ room_id: roomId, label: 'K-TEST-1', size: 'medium' });

    expect(res.status).toBe(201);
    expect(res.body.label).toBe('K-TEST-1');
    expect(res.body.size).toBe('medium');
    expect(res.body.status).toBe('AVAILABLE');
    expect(res.body.room.id).toBe(roomId);

    const created = await prisma.kennelUnit.findFirst({ where: { room_id: roomId, label: 'K-TEST-1' } });
    expect(created).not.toBeNull();
  });

  it('rejects a room that does not belong to the clinic', async () => {
    const otherClinic = await prisma.clinic.create({ data: { name: 'Other Ward Clinic' } });
    const otherRoom = await prisma.room.create({
      data: { clinic_id: otherClinic.id, name: 'Other Room', type: 'ward' },
    });

    const res = await request
      .post('/api/v1/ward/kennels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ room_id: otherRoom.id, label: 'K-HACK', size: 'small' });

    expect(res.status).toBe(404);

    await prisma.room.delete({ where: { id: otherRoom.id } });
    await prisma.clinic.delete({ where: { id: otherClinic.id } });
  });

  it('rejects an invalid payload', async () => {
    const res = await request
      .post('/api/v1/ward/kennels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ room_id: roomId, label: '', size: 'huge' });

    expect(res.status).toBe(422);
  });

  it('forbids a role without WARD_WRITE permission', async () => {
    const res = await request
      .post('/api/v1/ward/kennels')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ room_id: roomId, label: 'K-TEST-2', size: 'small' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/ward/kennels', () => {
  it('includes newly created kennels', async () => {
    const res = await request
      .get('/api/v1/ward/kennels')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((k: { label: string }) => k.label === 'K-TEST-1')).toBe(true);
  });

  it('filters by status', async () => {
    const res = await request
      .get('/api/v1/ward/kennels?status=AVAILABLE')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.every((k: { status: string }) => k.status === 'AVAILABLE')).toBe(true);
    expect(res.body.some((k: { label: string }) => k.label === 'K-TEST-1')).toBe(true);
  });

  it('rejects an invalid status filter', async () => {
    const res = await request
      .get('/api/v1/ward/kennels?status=BROKEN')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/v1/ward/kennels/:id/status', () => {
  it('transitions an available kennel to out of service and back', async () => {
    const kennel = await prisma.kennelUnit.create({
      data: { room_id: roomId, label: 'K-STATUS-1', size: 'small' },
    });

    const toOutOfService = await request
      .patch(`/api/v1/ward/kennels/${kennel.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OUT_OF_SERVICE' });
    expect(toOutOfService.status).toBe(200);
    expect(toOutOfService.body.status).toBe('OUT_OF_SERVICE');

    const backToAvailable = await request
      .patch(`/api/v1/ward/kennels/${kennel.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'AVAILABLE' });
    expect(backToAvailable.status).toBe(200);
    expect(backToAvailable.body.status).toBe('AVAILABLE');
  });

  it('rejects setting status to OCCUPIED directly', async () => {
    const kennel = await prisma.kennelUnit.create({
      data: { room_id: roomId, label: 'K-STATUS-2', size: 'small' },
    });

    const res = await request
      .patch(`/api/v1/ward/kennels/${kennel.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OCCUPIED' });

    expect(res.status).toBe(422);
  });

  it('refuses to change the status of an occupied kennel', async () => {
    const kennel = await prisma.kennelUnit.create({
      data: { room_id: roomId, label: 'K-STATUS-3', size: 'small', status: 'OCCUPIED' },
    });

    const res = await request
      .patch(`/api/v1/ward/kennels/${kennel.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLEANING' });

    expect(res.status).toBe(409);
  });
});

describe('Admit / discharge kennel status lifecycle', () => {
  it('rejects admission into a kennel that is not available, and discharge moves the kennel to cleaning', async () => {
    const kennel = await prisma.kennelUnit.create({
      data: { room_id: roomId, label: 'K-LIFECYCLE-1', size: 'small', status: 'CLEANING' },
    });

    const owner = await prisma.owner.create({
      data: { clinic_id: clinicId, first_name: 'Ward', last_name: 'Owner', phone: '+1555555' },
    });
    const pet = await prisma.pet.create({ data: { owner_id: owner.id, name: 'Rex', species: 'DOG' } });

    const rejected = await request
      .post('/api/v1/ward/hospitalizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pet_id: pet.id, kennel_id: kennel.id, reason: 'Observation' });
    expect(rejected.status).toBe(409);

    await prisma.kennelUnit.update({ where: { id: kennel.id }, data: { status: 'AVAILABLE' } });

    const admitted = await request
      .post('/api/v1/ward/hospitalizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pet_id: pet.id, kennel_id: kennel.id, reason: 'Observation' });
    expect(admitted.status).toBe(201);

    const occupiedKennel = await prisma.kennelUnit.findUnique({ where: { id: kennel.id } });
    expect(occupiedKennel?.status).toBe('OCCUPIED');

    const discharged = await request
      .patch(`/api/v1/ward/hospitalizations/${admitted.body.id}/discharge`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(discharged.status).toBe(200);

    const cleanedKennel = await prisma.kennelUnit.findUnique({ where: { id: kennel.id } });
    expect(cleanedKennel?.status).toBe('CLEANING');

    await prisma.hospitalization.deleteMany({ where: { kennel_id: kennel.id } });
    await prisma.pet.delete({ where: { id: pet.id } });
    await prisma.owner.delete({ where: { id: owner.id } });
  });
});
