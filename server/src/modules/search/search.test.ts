import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let clinicId: string;
let adminToken: string;
let receptionistToken: string;

interface SearchResultItem { title: string; }
interface SearchGroup { key: string; items: SearchResultItem[]; }

function findGroup(groups: SearchGroup[], key: string) {
  return groups.find((g) => g.key === key);
}

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'Search Test Clinic' } });
  clinicId = clinic.id;

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@searchtest.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Searchy',
      last_name: 'Adminson',
      role: 'ADMIN',
    },
  });

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'reception@searchtest.test',
      password_hash: await bcrypt.hash('Reception@1234', 12),
      first_name: 'Test',
      last_name: 'Receptionist',
      role: 'RECEPTIONIST',
    },
  });

  const adminLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@searchtest.test', password: 'Admin@1234' });
  adminToken = adminLogin.body.accessToken as string;

  const receptionLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: 'reception@searchtest.test', password: 'Reception@1234' });
  receptionistToken = receptionLogin.body.accessToken as string;

  const owner = await prisma.owner.create({
    data: { clinic_id: clinicId, first_name: 'Zephyria', last_name: 'Quoxworth', phone: '+1555999000' },
  });
  await prisma.pet.create({ data: { owner_id: owner.id, name: 'Fluffybutt', species: 'CAT' } });

  // A second clinic's data must never leak into the first clinic's search results.
  const otherClinic = await prisma.clinic.create({ data: { name: 'Other Search Test Clinic' } });
  const otherOwner = await prisma.owner.create({
    data: { clinic_id: otherClinic.id, first_name: 'Zephyria', last_name: 'Imposter', phone: '+1555999001' },
  });
  await prisma.pet.create({ data: { owner_id: otherOwner.id, name: 'ZephyriaCat', species: 'DOG' } });

  // cleanup for the second clinic happens here since no other test touches it
  await prisma.pet.deleteMany({ where: { owner: { clinic_id: otherClinic.id } } });
  await prisma.owner.deleteMany({ where: { clinic_id: otherClinic.id } });
  await prisma.clinic.delete({ where: { id: otherClinic.id } });
});

afterAll(async () => {
  await prisma.pet.deleteMany({ where: { owner: { clinic_id: clinicId } } });
  await prisma.owner.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('GET /api/v1/search', () => {
  it('finds owners and pets across categories for a matching query', async () => {
    const res = await request
      .get('/api/v1/search')
      .query({ q: 'Zephyria' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const ownersGroup = findGroup(res.body.groups, 'owners');
    expect(ownersGroup?.items).toHaveLength(1);
    expect(ownersGroup?.items[0]).toMatchObject({ title: 'Zephyria Quoxworth' });
  });

  it('scopes results to the caller clinic only', async () => {
    const res = await request
      .get('/api/v1/search')
      .query({ q: 'Zephyria' })
      .set('Authorization', `Bearer ${adminToken}`);

    const ownersGroup = findGroup(res.body.groups, 'owners');
    const titles = ownersGroup?.items.map((i: { title: string }) => i.title) ?? [];
    expect(titles).not.toContain('Zephyria Imposter');
  });

  it('finds pets by name', async () => {
    const res = await request
      .get('/api/v1/search')
      .query({ q: 'Fluffybutt' })
      .set('Authorization', `Bearer ${adminToken}`);

    const petsGroup = findGroup(res.body.groups, 'pets');
    expect(petsGroup?.items[0]).toMatchObject({ title: 'Fluffybutt' });
  });

  it('includes the staff category for a role with STAFF_READ', async () => {
    const res = await request
      .get('/api/v1/search')
      .query({ q: 'Adminson' })
      .set('Authorization', `Bearer ${adminToken}`);

    const staffGroup = findGroup(res.body.groups, 'staff');
    expect(staffGroup?.items[0]).toMatchObject({ title: 'Searchy Adminson' });
  });

  it('omits the staff category for a role without STAFF_READ', async () => {
    const res = await request
      .get('/api/v1/search')
      .query({ q: 'Adminson' })
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(findGroup(res.body.groups, 'staff')).toBeUndefined();
  });

  it('still returns permitted categories for a role without STAFF_READ', async () => {
    const res = await request
      .get('/api/v1/search')
      .query({ q: 'Zephyria' })
      .set('Authorization', `Bearer ${receptionistToken}`);

    const ownersGroup = findGroup(res.body.groups, 'owners');
    expect(ownersGroup?.items).toHaveLength(1);
  });

  it('rejects requests with no access token', async () => {
    const res = await request.get('/api/v1/search').query({ q: 'Zephyria' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty query', async () => {
    const res = await request
      .get('/api/v1/search')
      .query({ q: '' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });
});
