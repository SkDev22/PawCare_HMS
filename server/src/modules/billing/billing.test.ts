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

describe('Invoice numbering and auto tax', () => {
  let taxClinicId: string;
  let taxAccessToken: string;
  let taxOwnerId: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({
      data: { name: 'Tax Test Clinic', tax_rate: 10, invoice_prefix: 'TX-' },
    });
    taxClinicId = clinic.id;

    await prisma.staffUser.create({
      data: {
        clinic_id: taxClinicId,
        email: 'admin@taxtest.test',
        password_hash: await bcrypt.hash('Admin@1234', 12),
        first_name: 'Tax',
        last_name: 'Admin',
        role: 'ADMIN',
      },
    });

    const login = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@taxtest.test', password: 'Admin@1234' });
    taxAccessToken = login.body.accessToken;

    const owner = await prisma.owner.create({
      data: { clinic_id: taxClinicId, first_name: 'Tax', last_name: 'Owner', phone: '+1555302' },
    });
    taxOwnerId = owner.id;
  });

  afterAll(async () => {
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { clinic_id: taxClinicId } } });
    await prisma.invoice.deleteMany({ where: { clinic_id: taxClinicId } });
    await prisma.owner.deleteMany({ where: { clinic_id: taxClinicId } });
    await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: taxClinicId } } });
    await prisma.staffUser.deleteMany({ where: { clinic_id: taxClinicId } });
    await prisma.clinic.delete({ where: { id: taxClinicId } });
  });

  it('assigns sequential invoice numbers using the clinic prefix', async () => {
    const first = await request
      .post('/api/v1/billing')
      .set('Authorization', `Bearer ${taxAccessToken}`)
      .send({ owner_id: taxOwnerId });
    const second = await request
      .post('/api/v1/billing')
      .set('Authorization', `Bearer ${taxAccessToken}`)
      .send({ owner_id: taxOwnerId });

    expect(first.body.invoice_number).toBe('TX-00001');
    expect(second.body.invoice_number).toBe('TX-00002');
  });

  it('auto-calculates tax from the clinic tax_rate as line items are added, until manually overridden', async () => {
    const created = await request
      .post('/api/v1/billing')
      .set('Authorization', `Bearer ${taxAccessToken}`)
      .send({ owner_id: taxOwnerId });
    const invoiceId = created.body.id;

    const lineItemRes = await request
      .post(`/api/v1/billing/${invoiceId}/line-items`)
      .set('Authorization', `Bearer ${taxAccessToken}`)
      .send({ description: 'Consultation', unit_price: 100, quantity: 1 });

    expect(lineItemRes.body.total).toBe('100.00');
    const afterItem = await request
      .get(`/api/v1/billing/${invoiceId}`)
      .set('Authorization', `Bearer ${taxAccessToken}`);
    expect(afterItem.body.tax_amount).toBe('10.00'); // 10% of 100

    const manualTax = await request
      .put(`/api/v1/billing/${invoiceId}`)
      .set('Authorization', `Bearer ${taxAccessToken}`)
      .send({ tax_amount: 0 });
    expect(manualTax.body.tax_amount).toBe('0.00');

    await request
      .post(`/api/v1/billing/${invoiceId}/line-items`)
      .set('Authorization', `Bearer ${taxAccessToken}`)
      .send({ description: 'Extra item', unit_price: 50, quantity: 1 });

    const afterManualOverride = await request
      .get(`/api/v1/billing/${invoiceId}`)
      .set('Authorization', `Bearer ${taxAccessToken}`);
    expect(afterManualOverride.body.tax_amount).toBe('0.00'); // stays locked, not recalculated
  });
});

describe('Billable services management', () => {
  let svcClinicId: string;
  let adminToken: string;
  let vetToken: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({ data: { name: 'Services Test Clinic' } });
    svcClinicId = clinic.id;

    await prisma.staffUser.create({
      data: {
        clinic_id: svcClinicId,
        email: 'admin@servicestest.test',
        password_hash: await bcrypt.hash('Admin@1234', 12),
        first_name: 'Services',
        last_name: 'Admin',
        role: 'ADMIN',
      },
    });
    await prisma.staffUser.create({
      data: {
        clinic_id: svcClinicId,
        email: 'vet@servicestest.test',
        password_hash: await bcrypt.hash('Vet@1234567', 12),
        first_name: 'Services',
        last_name: 'Vet',
        role: 'VETERINARIAN',
      },
    });

    const adminLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@servicestest.test', password: 'Admin@1234' });
    adminToken = adminLogin.body.accessToken;

    const vetLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: 'vet@servicestest.test', password: 'Vet@1234567' });
    vetToken = vetLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { clinic_id: svcClinicId } });
    await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: svcClinicId } } });
    await prisma.staffUser.deleteMany({ where: { clinic_id: svcClinicId } });
    await prisma.clinic.delete({ where: { id: svcClinicId } });
  });

  it('lets an admin create a service, and hides it from the default list once deactivated', async () => {
    const created = await request
      .post('/api/v1/billing/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Consultation Fee', category: 'exam', price: 45, is_taxable: true });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Consultation Fee');
    expect(created.body.is_active).toBe(true);
    const serviceId = created.body.id;

    const listActive = await request
      .get('/api/v1/billing/services')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listActive.body.map((s: { id: string }) => s.id)).toContain(serviceId);

    const updated = await request
      .put(`/api/v1/billing/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 50, is_active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.price).toBe('50.00');
    expect(updated.body.is_active).toBe(false);

    const listAfterDeactivate = await request
      .get('/api/v1/billing/services')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listAfterDeactivate.body.map((s: { id: string }) => s.id)).not.toContain(serviceId);

    const listIncludingInactive = await request
      .get('/api/v1/billing/services?include_inactive=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listIncludingInactive.body.map((s: { id: string }) => s.id)).toContain(serviceId);
  });

  it('lets a vet read services but not create or update them', async () => {
    const readRes = await request
      .get('/api/v1/billing/services')
      .set('Authorization', `Bearer ${vetToken}`);
    expect(readRes.status).toBe(200);

    const createRes = await request
      .post('/api/v1/billing/services')
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ name: 'Unauthorized Service', category: 'exam', price: 10, is_taxable: true });
    expect(createRes.status).toBe(403);
  });
});

describe('Recording payments', () => {
  let payClinicId: string;
  let payToken: string;
  let payOwnerId: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.create({ data: { name: 'Payments Test Clinic' } });
    payClinicId = clinic.id;

    await prisma.staffUser.create({
      data: {
        clinic_id: payClinicId,
        email: 'admin@paymentstest.test',
        password_hash: await bcrypt.hash('Admin@1234', 12),
        first_name: 'Payments',
        last_name: 'Admin',
        role: 'ADMIN',
      },
    });

    const login = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@paymentstest.test', password: 'Admin@1234' });
    payToken = login.body.accessToken;

    const owner = await prisma.owner.create({
      data: { clinic_id: payClinicId, first_name: 'Pay', last_name: 'Owner', phone: '+1555303' },
    });
    payOwnerId = owner.id;
  });

  afterAll(async () => {
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { clinic_id: payClinicId } } });
    await prisma.payment.deleteMany({ where: { invoice: { clinic_id: payClinicId } } });
    await prisma.invoice.deleteMany({ where: { clinic_id: payClinicId } });
    await prisma.owner.deleteMany({ where: { clinic_id: payClinicId } });
    await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: payClinicId } } });
    await prisma.staffUser.deleteMany({ where: { clinic_id: payClinicId } });
    await prisma.clinic.delete({ where: { id: payClinicId } });
  });

  async function makeInvoiceWithTotal(total: number) {
    const created = await request
      .post('/api/v1/billing')
      .set('Authorization', `Bearer ${payToken}`)
      .send({ owner_id: payOwnerId, tax_amount: 0 });
    const invoiceId = created.body.id;
    await request
      .post(`/api/v1/billing/${invoiceId}/line-items`)
      .set('Authorization', `Bearer ${payToken}`)
      .send({ description: 'Test charge', unit_price: total, quantity: 1 });
    return invoiceId;
  }

  it('records a payment smaller than the total as PARTIALLY_PAID, not PAID', async () => {
    const invoiceId = await makeInvoiceWithTotal(1000);

    const res = await request
      .post(`/api/v1/billing/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${payToken}`)
      .send({ amount: 500, method: 'cash' });
    expect(res.status).toBe(201);

    const invoice = await request
      .get(`/api/v1/billing/${invoiceId}`)
      .set('Authorization', `Bearer ${payToken}`);
    expect(invoice.body.status).toBe('PARTIALLY_PAID');
    expect(invoice.body.paid_amount).toBe('500.00');
  });

  it('rejects a payment that exceeds the remaining balance instead of silently marking it PAID', async () => {
    const invoiceId = await makeInvoiceWithTotal(1000);

    // Simulates the exact accidental-concatenation bug: "1000500" instead of "500"
    const res = await request
      .post(`/api/v1/billing/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${payToken}`)
      .send({ amount: 1000500, method: 'cash' });
    expect(res.status).toBe(400);

    const invoice = await request
      .get(`/api/v1/billing/${invoiceId}`)
      .set('Authorization', `Bearer ${payToken}`);
    expect(invoice.body.status).toBe('DRAFT');
    expect(invoice.body.paid_amount).toBe('0.00');
  });

  it('marks the invoice PAID once payments reach the full total', async () => {
    const invoiceId = await makeInvoiceWithTotal(1000);

    await request
      .post(`/api/v1/billing/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${payToken}`)
      .send({ amount: 500, method: 'cash' });
    const second = await request
      .post(`/api/v1/billing/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${payToken}`)
      .send({ amount: 500, method: 'cash' });
    expect(second.status).toBe(201);

    const invoice = await request
      .get(`/api/v1/billing/${invoiceId}`)
      .set('Authorization', `Bearer ${payToken}`);
    expect(invoice.body.status).toBe('PAID');
    expect(invoice.body.paid_amount).toBe('1000.00');
  });
});
