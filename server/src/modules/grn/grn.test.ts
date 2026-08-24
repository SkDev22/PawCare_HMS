import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const request = supertest(app);

let clinicId: string;
let adminToken: string;
let itemId: string;

beforeAll(async () => {
  const clinic = await prisma.clinic.create({ data: { name: 'GRN Test Clinic' } });
  clinicId = clinic.id;

  await prisma.staffUser.create({
    data: {
      clinic_id: clinicId,
      email: 'admin@grntest.test',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      first_name: 'Test',
      last_name: 'Admin',
      role: 'ADMIN',
    },
  });

  const adminLogin = await request
    .post('/api/v1/auth/login')
    .send({ email: 'admin@grntest.test', password: 'Admin@1234' });
  adminToken = adminLogin.body.accessToken as string;

  const item = await prisma.inventoryItem.create({
    data: {
      clinic_id: clinicId,
      name: 'GRN Test Drug',
      category: 'MEDICATION',
      unit: 'tablet',
    },
  });
  itemId = item.id;
});

afterAll(async () => {
  await prisma.inventoryTransaction.deleteMany({ where: { item: { clinic_id: clinicId } } });
  await prisma.stockBatch.deleteMany({ where: { item: { clinic_id: clinicId } } });
  await prisma.goodsReceivedNoteItem.deleteMany({ where: { grn: { clinic_id: clinicId } } });
  await prisma.goodsReceivedNote.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.inventoryItem.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.refreshToken.deleteMany({ where: { staff: { clinic_id: clinicId } } });
  await prisma.staffUser.deleteMany({ where: { clinic_id: clinicId } });
  await prisma.clinic.delete({ where: { id: clinicId } });
  await prisma.$disconnect();
});

describe('POST /api/v1/grn', () => {
  it('receives stock and creates a batch per line item', async () => {
    const res = await request
      .post('/api/v1/grn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Acme Pharma',
        supplier_invoice_no: 'INV-001',
        items: [
          {
            item_id: itemId,
            batch_no: 'B-001',
            quantity: 100,
            unit_cost: 1.5,
            selling_price: 3,
            discount_percent: 10,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.grn_number).toMatch(/^GRN-/);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].batch).not.toBeNull();
    expect(res.body.items[0].batch.quantity_remaining).toBe(100);

    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.quantity_on_hand).toBe(100);

    const batches = await prisma.stockBatch.findMany({ where: { item_id: itemId } });
    expect(batches).toHaveLength(1);
    expect(Number(batches[0].discount_percent)).toBe(10);
  });

  it('rejects a line item referencing an unknown inventory item', async () => {
    const res = await request
      .post('/api/v1/grn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Acme Pharma',
        items: [
          {
            item_id: '00000000-0000-0000-0000-000000000000',
            quantity: 10,
            unit_cost: 1,
            selling_price: 2,
          },
        ],
      });

    expect(res.status).toBe(404);
  });

  it('a second GRN for the same item creates an independent batch at a different price', async () => {
    const res = await request
      .post('/api/v1/grn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Acme Pharma',
        items: [
          { item_id: itemId, batch_no: 'B-002', quantity: 50, unit_cost: 2, selling_price: 4 },
        ],
      });

    expect(res.status).toBe(201);

    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.quantity_on_hand).toBe(150);

    const batches = await prisma.stockBatch.findMany({
      where: { item_id: itemId },
      orderBy: { received_at: 'asc' },
    });
    expect(batches).toHaveLength(2);
    expect(Number(batches[0].selling_price)).toBe(3);
    expect(Number(batches[1].selling_price)).toBe(4);
  });
});

describe('GET /api/v1/grn', () => {
  it('lists goods received notes for the clinic', async () => {
    const res = await request.get('/api/v1/grn').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
  });
});
