import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let accessToken: string;
let clinicId: string;
let ownerOneId: string;
let ownerTwoId: string;
let invoiceOneId: string;
let invoiceTwoId: string;

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'Billing Search Test Clinic' } });
  clinicId = clinic.id;

  const admin = await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@billingsearch.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name: 'Admin',
      role: 'ADMIN',
    },
  });

  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@billingsearch.test', password: 'Admin@1234' });
  accessToken = res.body.accessToken as string;

  const ownerOne = await prisma.owner.create({
    data: { clinic_id: clinicId, first_name: 'Searchable', last_name: 'OwnerOne', phone: '+1555300' },
  });
  ownerOneId = ownerOne.id;
  const pet = await prisma.pet.create({ data: { owner_id: ownerOne.id, name: 'Fluffy', species: 'CAT' } });

  const now = new Date();
  const appointment = await prisma.appointment.create({
    data: {
      clinic_id: clinicId,
      pet_id: pet.id,
      vet_id: admin.id,
      type: 'SICK_VISIT',
      start_at: now,
      end_at: new Date(now.getTime() + 30 * 60 * 1000),
    },
  });

  const invoiceOneRes = await request
    .post('/api/v1/billing')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ owner_id: ownerOneId, appointment_id: appointment.id });
  invoiceOneId = invoiceOneRes.body.id;

  const ownerTwo = await prisma.owner.create({
    data: { clinic_id: clinicId, first_name: 'Other', last_name: 'Person', phone: '+1555301' },
  });
  ownerTwoId = ownerTwo.id;

  const invoiceTwoRes = await request
    .post('/api/v1/billing')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ owner_id: ownerTwoId });
  invoiceTwoId = invoiceTwoRes.body.id;
});

afterAll(async () => {
  await prisma.invoiceLineItem.deleteMany({ where: { invoice_id: { in: [invoiceOneId, invoiceTwoId] } } });
  await prisma.invoice.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.appointment.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.pet.deleteMany({ where: { owner: { clinic_id: clinicId } } });
  await prisma.owner.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('GET /api/v1/billing?search=', () => {
  it('finds an invoice by owner name', async () => {
    const res = await request
      .get('/api/v1/billing?search=Searchable')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { id: string }) => i.id);
    expect(ids).toContain(invoiceOneId);
    expect(ids).not.toContain(invoiceTwoId);
  });

  it('finds an invoice by the linked pet name', async () => {
    const res = await request
      .get('/api/v1/billing?search=Fluffy')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { id: string }) => i.id);
    expect(ids).toContain(invoiceOneId);
  });

  it('does not match unrelated owners', async () => {
    const res = await request
      .get('/api/v1/billing?search=Other')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: { id: string }) => i.id);
    expect(ids).toContain(invoiceTwoId);
    expect(ids).not.toContain(invoiceOneId);
  });
});
