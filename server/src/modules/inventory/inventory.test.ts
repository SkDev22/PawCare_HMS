import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let clinicId: string;
let adminToken: string;

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'Inventory Delete Test Clinic' } });
  clinicId = clinic.id;

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@invdeltest.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name: 'Admin',
      role: 'ADMIN',
    },
  });

  const adminLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@invdeltest.test', password: 'Admin@1234' });
  adminToken = adminLogin.body.accessToken as string;
});

afterAll(async () => {
  await prisma.inventoryTransaction.deleteMany({ where: { item: { clinic_id: clinicId } } });
  await prisma.stockBatch.deleteMany({ where: { item: { clinic_id: clinicId } } });
  await prisma.inventoryItem.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('DELETE /api/v1/inventory/:id', () => {
  it('deletes an item that has never been stocked', async () => {
    const item = await prisma.inventoryItem.create({
      data: { clinic_id: clinicId, name: 'Tremadol 250mg (typo)', category: 'MEDICATION', unit: 'tablet' },
    });

    const res = await request
      .delete(`/api/v1/inventory/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
    const found = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    expect(found).toBeNull();
  });

  it('rejects deleting an item that has stock history', async () => {
    const item = await prisma.inventoryItem.create({
      data: { clinic_id: clinicId, name: 'Tramadol 250mg', category: 'MEDICATION', unit: 'tablet', quantity_on_hand: 10 },
    });
    await prisma.stockBatch.create({
      data: {
        item_id: item.id,
        quantity_received: 10,
        quantity_remaining: 10,
        unit_cost: 0.5,
        selling_price: 2,
      },
    });

    const res = await request
      .delete(`/api/v1/inventory/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    const found = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    expect(found).not.toBeNull();
  });

  it('returns 404 for an item outside the clinic', async () => {
    const otherClinic = await prisma.clinic.create({ data: { name: 'Other Inventory Clinic' } });
    const otherItem = await prisma.inventoryItem.create({
      data: { clinic_id: otherClinic.id, name: 'Other Item', category: 'MEDICATION', unit: 'tablet' },
    });

    const res = await request
      .delete(`/api/v1/inventory/${otherItem.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);

    await prisma.inventoryItem.delete({ where: { id: otherItem.id } });
    await prisma.clinic.delete({ where: { id: otherClinic.id } });
  });
});
