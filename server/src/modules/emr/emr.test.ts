import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let accessToken: string;
let clinicId: string;
let staffId: string;
let petId: string;
let ownerId: string;
let itemId: string;

async function createAppointment() {
  const now = new Date();
  const appt = await prisma.appointment.create({
    data: {
      clinic_id: clinicId,
      pet_id: petId,
      vet_id: staffId,
      type: 'SICK_VISIT',
      start_at: now,
      end_at: new Date(now.getTime() + 30 * 60 * 1000),
    },
  });
  return appt.id;
}

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'EMR Charges Test Clinic' } });
  clinicId = clinic.id;

  const admin = await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@emrcharges.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name: 'Admin',
      role: 'ADMIN',
    },
  });
  staffId = admin.id;

  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@emrcharges.test', password: 'Admin@1234' });
  accessToken = res.body.accessToken as string;

  const owner = await prisma.owner.create({
    data: { clinic_id: clinicId, first_name: 'Charge', last_name: 'Owner', phone: '+1555200' },
  });
  ownerId = owner.id;
  const pet = await prisma.pet.create({ data: { owner_id: owner.id, name: 'Milo', species: 'CAT' } });
  petId = pet.id;

  const item = await prisma.inventoryItem.create({
    data: {
      clinic_id: clinicId,
      name: 'Amoxicillin 250mg',
      category: 'MEDICATION',
      unit: 'tablet',
      unit_cost: 0.5,
      selling_price: 2,
      quantity_on_hand: 500,
    },
  });
  itemId = item.id;
});

afterAll(async () => {
  await prisma.prescription.deleteMany({ where: { pet_id: petId } });
  await prisma.medicalRecordCharge.deleteMany({ where: { medical_record: { pet: { owner_id: ownerId } } } });
  await prisma.invoiceLineItem.deleteMany({ where: { invoice: { owner_id: ownerId } } });
  await prisma.payment.deleteMany({ where: { invoice: { owner_id: ownerId } } });
  await prisma.invoice.deleteMany({ where: { owner_id: ownerId } });
  await prisma.medicalRecord.deleteMany({ where: { pet_id: petId } });
  await prisma.appointment.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.inventoryTransaction.deleteMany({ where: { item_id: itemId } });
  await prisma.inventoryItem.delete({ where: { id: itemId } });
  await prisma.pet.deleteMany({ where: { owner_id: ownerId } });
  await prisma.owner.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('POST /api/v1/medical-records/:id/charges', () => {
  it('bills a charge even when the medical record has no linked appointment', async () => {
    const recordRes = await request
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, chief_complaint: 'No appointment' });
    expect(recordRes.status).toBe(201);
    const recordId = recordRes.body.id as string;

    const chargeRes = await request
      .post(`/api/v1/medical-records/${recordId}/charges`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ item_id: itemId, quantity: 1 });
    expect(chargeRes.status).toBe(201);

    const invoice = await prisma.invoice.findFirst({ where: { owner_id: ownerId, appointment_id: null } });
    expect(invoice).not.toBeNull();
    expect(Number(invoice!.total)).toBe(2);

    // A second charge on the same appointment-less record reuses the same invoice.
    const secondCharge = await request
      .post(`/api/v1/medical-records/${recordId}/charges`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ item_id: itemId, quantity: 1 });
    expect(secondCharge.status).toBe(201);

    const invoicesForOwner = await prisma.invoice.findMany({ where: { owner_id: ownerId, appointment_id: null } });
    expect(invoicesForOwner).toHaveLength(1);
    expect(Number(invoicesForOwner[0].total)).toBe(4);
  });

  it('adds a charge: creates the invoice, line item, and deducts stock', async () => {
    const stockBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });

    const appointmentId = await createAppointment();
    const recordRes = await request
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, appointment_id: appointmentId, chief_complaint: 'Infection' });
    const recordId = recordRes.body.id as string;

    const chargeRes = await request
      .post(`/api/v1/medical-records/${recordId}/charges`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ item_id: itemId, quantity: 3 });

    expect(chargeRes.status).toBe(201);
    expect(chargeRes.body.total).toBe('6');

    const invoice = await prisma.invoice.findUnique({ where: { appointment_id: appointmentId } });
    expect(invoice).not.toBeNull();
    expect(Number(invoice!.total)).toBe(6);

    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.quantity_on_hand).toBe(stockBefore.quantity_on_hand - 3);
  });

  it('rejects a charge that would oversell stock', async () => {
    const appointmentId = await createAppointment();
    const recordRes = await request
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, appointment_id: appointmentId });
    const recordId = recordRes.body.id as string;

    const res = await request
      .post(`/api/v1/medical-records/${recordId}/charges`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ item_id: itemId, quantity: 999999 });

    expect(res.status).toBe(409);
  });

  it('removing a charge restocks the item and shrinks the invoice total', async () => {
    const appointmentId = await createAppointment();
    const recordRes = await request
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, appointment_id: appointmentId });
    const recordId = recordRes.body.id as string;

    const before = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });

    const chargeRes = await request
      .post(`/api/v1/medical-records/${recordId}/charges`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ item_id: itemId, quantity: 2 });
    expect(chargeRes.status).toBe(201);

    const afterCharge = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(afterCharge.quantity_on_hand).toBe(before.quantity_on_hand - 2);

    const delRes = await request
      .delete(`/api/v1/medical-records/${recordId}/charges/${chargeRes.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(delRes.status).toBe(204);

    const afterRemove = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(afterRemove.quantity_on_hand).toBe(before.quantity_on_hand);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { appointment_id: appointmentId } });
    expect(Number(invoice.total)).toBe(0);
  });
});

describe('POST /api/v1/medical-records/:id/prescriptions — clinic vs pharmacy fulfillment', () => {
  it('a clinic-dispensed prescription (item_id given) bills and deducts stock', async () => {
    const stockBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    const appointmentId = await createAppointment();
    const recordRes = await request
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, appointment_id: appointmentId });
    const recordId = recordRes.body.id as string;

    const rxRes = await request
      .post(`/api/v1/medical-records/${recordId}/prescriptions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        drug_name: 'Amoxicillin', dosage: '250mg', frequency: 'Twice daily',
        quantity: 4, item_id: itemId,
      });

    expect(rxRes.status).toBe(201);
    expect(rxRes.body.item_id).toBe(itemId);
    expect(rxRes.body.charge_id).toBeTruthy();

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { appointment_id: appointmentId } });
    expect(Number(invoice.total)).toBe(8);

    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.quantity_on_hand).toBe(stockBefore.quantity_on_hand - 4);
  });

  it('a pharmacy-fulfilled prescription (no item_id) does not bill or touch stock', async () => {
    const stockBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    const appointmentId = await createAppointment();
    const recordRes = await request
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, appointment_id: appointmentId });
    const recordId = recordRes.body.id as string;

    const rxRes = await request
      .post(`/api/v1/medical-records/${recordId}/prescriptions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ drug_name: 'Custom Compound', dosage: '10mg', frequency: 'Once daily' });

    expect(rxRes.status).toBe(201);
    expect(rxRes.body.item_id).toBeNull();
    expect(rxRes.body.charge_id).toBeNull();

    const invoice = await prisma.invoice.findUnique({ where: { appointment_id: appointmentId } });
    expect(invoice).toBeNull();

    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.quantity_on_hand).toBe(stockBefore.quantity_on_hand);
  });

  it('deactivating a clinic-dispensed prescription reverses the charge and restocks', async () => {
    const stockBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    const appointmentId = await createAppointment();
    const recordRes = await request
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pet_id: petId, appointment_id: appointmentId });
    const recordId = recordRes.body.id as string;

    const rxRes = await request
      .post(`/api/v1/medical-records/${recordId}/prescriptions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        drug_name: 'Amoxicillin', dosage: '250mg', frequency: 'Twice daily',
        quantity: 2, item_id: itemId,
      });
    expect(rxRes.status).toBe(201);

    const afterAdd = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(afterAdd.quantity_on_hand).toBe(stockBefore.quantity_on_hand - 2);

    const delRes = await request
      .delete(`/api/v1/medical-records/${recordId}/prescriptions/${rxRes.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(delRes.status).toBe(204);

    const afterRemove = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(afterRemove.quantity_on_hand).toBe(stockBefore.quantity_on_hand);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { appointment_id: appointmentId } });
    expect(Number(invoice.total)).toBe(0);
  });
});
