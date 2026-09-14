import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { encrypt } from '../lib/encryption';
import { prisma as sharedPrisma } from '../lib/prisma';
import { createGrn } from '../modules/grn/grn.service';
import { setPreferredBatch } from '../modules/inventory/inventory.service';
import { addVaccination, addPrescription, addCharge } from '../modules/emr/emr.service';
import { createSale, processReturn } from '../modules/pos/pos.service';
import { createInvoice, addLineItem, recordPayment, updateStatus, updateInvoice } from '../modules/billing/billing.service';

// Usage:
//   pnpm --filter server db:seed
//     Seeds (or reuses) the first clinic in the DB with the fixed
//     pawcare.vet demo staff/owner emails and item SKUs/barcodes — this is
//     what db:reset's auto-seed hook runs, unchanged from before.
//
//   pnpm --filter server db:seed -- --email admin@theirclinic.com
//     Targets the clinic that staff member belongs to instead (e.g. one
//     just made with clinic:create) and seeds the full demo dataset into
//     it, deriving distinct staff/owner emails and item SKUs/barcodes from
//     that clinic so they don't collide with any other already-seeded
//     clinic's data (StaffUser.email, Owner.email, and
//     InventoryItem.sku/barcode are all globally unique columns).
//
// This seed calls the same service-layer functions the real app uses
// (createGrn, addVaccination, addPrescription, addCharge, createSale,
// processReturn, createInvoice/addLineItem/recordPayment) instead of
// writing rows directly with Prisma wherever real business logic is
// involved — stock batches, invoice numbering, controlled-substance
// approval, and low-stock/controlled-substance notifications all have to
// come out the other end exactly as they would from the real UI, or the
// seeded data would model a state the app itself could never produce.
// Plain 1:1 records with no side effects (owners, pets, appointments,
// vitals, SOAP notes, diagnoses, lab results, hospitalization/care logs)
// are still created directly — there's no service-layer logic to bypass there.
//
// Deliberately NOT seeded:
// - Attachment: needs a real S3 object; a fabricated s3_key would 404 when
//   opened in a demo, which is worse than the tab being empty.
// - RolePermissionOverride, NotificationPreference: absence is a normal,
//   correct default state (no per-clinic override / opted-in to everything),
//   not a gap.
// - RefreshToken, PasswordResetToken, AuditLog, DailyCounter: runtime/transient
//   tables populated by the app itself as it's used, never seeded data.
//
// The two service functions use their own PrismaClient (server/src/lib/prisma.ts) —
// a second, separate connection to the same database, not a conflict — so
// it's disconnected on its own at the end alongside this script's client.

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}
function isoDaysFromNow(days: number): string {
  return daysFromNow(days).toISOString();
}

// --email <existing-staff-email> targets that staff member's clinic instead
// of the default "first clinic in the DB" — e.g. one created via
// clinic:create. Since StaffUser.email, Owner.email, and
// InventoryItem.sku/barcode are all globally unique (not scoped per
// clinic), re-running this seed for a second clinic needs its own set of
// those values — emailDomain/clinicTag below derive them from the target,
// so the default no-args path (used by db:reset's auto-seed hook) is
// completely unaffected and keeps using the original fixed pawcare.vet values.
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const token = raw[i];
    if (token?.startsWith('--')) {
      const key = token.slice(2);
      const value = raw[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }
      args[key] = value;
      i++;
    }
  }
  return args;
}

async function main() {
  console.log('🌱 Seeding database...');

  const args = parseArgs();

  let clinic;
  let emailDomain = 'pawcare.vet';
  let clinicTag = '';

  if (args['email']) {
    const targetStaff = await prisma.staffUser.findUnique({ where: { email: args['email'] } });
    if (!targetStaff) {
      console.error(`❌ No staff account found with email ${args['email']} — create the clinic first with clinic:create.`);
      process.exit(1);
    }
    clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: targetStaff.clinic_id } });
    emailDomain = args['email'].split('@')[1]!;
    clinicTag = clinic.id.replace(/-/g, '').slice(0, 6).toUpperCase();
    console.log(`ℹ️  Targeting clinic: ${clinic.name} (${clinic.id})`);
  } else {
    clinic = await prisma.clinic.findFirst();

    if (!clinic) {
      clinic = await prisma.clinic.create({
        data: {
          name: 'PawCare Animal Hospital',
          email: 'clinic@pawcare.vet',
          phone: '+1-555-0100',
          address: '123 Vet Lane, Springfield',
          timezone: 'America/New_York',
          currency: 'LKR',
          // A modest sales-tax rate so tax lines actually show up somewhere in
          // the demo (POS sales and manually-created invoices auto-compute
          // tax from this — EMR-visit invoices never do, tax-free by design;
          // see emr.service.ts's createChargeTx, which doesn't touch tax_amount).
          tax_rate: 8.5,
        },
      });
      console.log(`✅ Created clinic: ${clinic.name} (${clinic.id})`);
    } else {
      console.log(`ℹ️  Clinic already exists: ${clinic.name}`);
    }
  }
  const clinicId = clinic.id;

  // Helpers for the two globally-unique catalog fields — inert (identity) on
  // the default path since clinicTag is only set when --email targets a
  // specific clinic.
  const sku = (base: string) => (clinicTag ? `${base}-${clinicTag}` : base);
  const barcode = (base: string) => (clinicTag ? `${base}-${clinicTag}` : base);
  // Owner.email is globally unique too — a "+tag" alias keeps it a valid,
  // distinct address per clinic without changing the visible local part.
  const ownerEmail = (local: string) => (clinicTag ? `${local}+${clinicTag.toLowerCase()}@example.com` : `${local}@example.com`);

  // Clinic operating hours — Mon–Sat 8:00–18:00, closed Sunday.
  const hoursCount = await prisma.clinicHours.count({ where: { clinic_id: clinicId } });
  if (hoursCount === 0) {
    await prisma.clinicHours.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((day) =>
        day === 0
          ? { clinic_id: clinicId, day_of_week: 0, is_closed: true }
          : { clinic_id: clinicId, day_of_week: day, open_time: '08:00', close_time: '18:00' },
      ),
    });
    console.log('✅ Created clinic operating hours');
  } else {
    console.log(`ℹ️  Clinic hours already set (${hoursCount} day(s))`);
  }

  // Create default admin user (when targeting a clinic via --email, this
  // naturally resolves to that same address and the "already exists" branch
  // below just reuses it — no duplicate admin is created).
  const adminEmail = `admin@${emailDomain}`;
  const existingAdmin = await prisma.staffUser.findUnique({ where: { email: adminEmail } });
  const adminWasCreated = !existingAdmin;

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: adminEmail,
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Created admin user: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // Create a sample veterinarian
  const vetEmail = `dr.smith@${emailDomain}`;
  const existingVet = await prisma.staffUser.findUnique({ where: { email: vetEmail } });

  if (!existingVet) {
    const passwordHash = await bcrypt.hash('Vet@123456', 12);
    await prisma.staffUser.create({
      data: {
        clinic_id: clinicId,
        email: vetEmail,
        password_hash: passwordHash,
        first_name: 'Sarah',
        last_name: 'Smith',
        role: 'VETERINARIAN',
        specialization: 'Small animals',
        license_number: encrypt('VET-2024-001'),
      },
    });
    console.log(`✅ Created veterinarian: ${vetEmail}`);
  }

  // ── Additional staff (second vet, nurse, receptionist, lab tech) ──────────
  const extraStaff = [
    { email: `dr.carter@${emailDomain}`, password: 'Vet@123456', first_name: 'James', last_name: 'Carter', role: 'VETERINARIAN' as const, specialization: 'Surgery', license_number: 'VET-2024-002' },
    { email: `nurse.amara@${emailDomain}`, password: 'Nurse@123456', first_name: 'Amara', last_name: 'Silva', role: 'NURSE' as const },
    { email: `receptionist@${emailDomain}`, password: 'Front@123456', first_name: 'Dilani', last_name: 'Perera', role: 'RECEPTIONIST' as const },
    { email: `labtech@${emailDomain}`, password: 'Lab@123456', first_name: 'Ruwan', last_name: 'Bandara', role: 'LAB_TECHNICIAN' as const },
  ];

  for (const s of extraStaff) {
    const existing = await prisma.staffUser.findUnique({ where: { email: s.email } });
    if (!existing) {
      const password_hash = await bcrypt.hash(s.password, 12);
      await prisma.staffUser.create({
        data: {
          clinic_id: clinicId,
          email: s.email,
          password_hash,
          first_name: s.first_name,
          last_name: s.last_name,
          role: s.role,
          specialization: 'specialization' in s ? s.specialization : null,
          license_number: 'license_number' in s ? encrypt(s.license_number) : null,
        },
      });
      console.log(`✅ Created ${s.role.toLowerCase()}: ${s.email}`);
    }
  }

  // Re-fetch staff refs (works whether just-created or pre-existing)
  const admin = await prisma.staffUser.findUniqueOrThrow({ where: { email: adminEmail } });
  const drSmith = await prisma.staffUser.findUniqueOrThrow({ where: { email: vetEmail } });
  const drCarter = await prisma.staffUser.findUniqueOrThrow({ where: { email: `dr.carter@${emailDomain}` } });
  const nurseAmara = await prisma.staffUser.findUniqueOrThrow({ where: { email: `nurse.amara@${emailDomain}` } });
  const receptionist = await prisma.staffUser.findUniqueOrThrow({ where: { email: `receptionist@${emailDomain}` } });

  // Weekly schedules — vets Mon–Fri, front-of-house Mon–Sat.
  const scheduleCount = await prisma.staffSchedule.count({ where: { staff: { clinic_id: clinicId } } });
  if (scheduleCount === 0) {
    const weekdays = [1, 2, 3, 4, 5];
    const sixDays = [1, 2, 3, 4, 5, 6];
    await prisma.staffSchedule.createMany({
      data: [
        ...weekdays.map((d) => ({ staff_id: drSmith.id, day_of_week: d, start_time: '09:00', end_time: '17:00' })),
        ...weekdays.map((d) => ({ staff_id: drCarter.id, day_of_week: d, start_time: '10:00', end_time: '18:00' })),
        ...sixDays.map((d) => ({ staff_id: nurseAmara.id, day_of_week: d, start_time: '08:00', end_time: '18:00' })),
        ...sixDays.map((d) => ({ staff_id: receptionist.id, day_of_week: d, start_time: '08:00', end_time: '18:00' })),
      ],
    });
    console.log('✅ Created weekly staff schedules');
  } else {
    console.log(`ℹ️  Staff schedules already exist (${scheduleCount} entr${scheduleCount === 1 ? 'y' : 'ies'})`);
  }

  // ── Inventory catalog (barcode + sku on every item, so barcode-scan
  //    lookup and the SKU search filter both have something real to find) ──
  const inventoryCount = await prisma.inventoryItem.count({ where: { clinic_id: clinicId } });

  // name -> [unit_cost, selling_price] for the initial GRN receipt below.
  const seedItemPricing: Record<string, [number, number]> = {
    'Normal Saline 0.9% 500ml':          [3.5, 12],
    'Disposable Syringe 5ml':            [0.2, 1.5],
    'IV Catheter 22G':                   [1.2, 6],
    'Surgical Gloves (pair)':            [0.3, 2],
    'Gauze Pads':                        [1.5, 5],
    'Amoxicillin 250mg':                 [0.4, 2],
    'Meloxicam 1.5mg/ml':                [0.6, 3],
    'Tramadol 50mg':                     [0.5, 2.5],
    'Rabies Vaccine':                    [4, 25],
    'DHPP Vaccine':                      [5, 30],
    'Digital Thermometer':               [15, 15],
    'Blood Glucose Test Strips':         [0.8, 4],
    'Prescription Diet Food (dog, 5kg)': [20, 45],
    'Premium Dog Shampoo 500ml':         [3, 8.5],
    'Cat Litter 10L':                    [4, 9.5],
    'Chew Toy - Rope':                   [1.5, 5],
    'Pet Carrier (Small)':               [12, 25],
    'Flea & Tick Collar':                [2.5, 7],
  };

  if (inventoryCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { clinic_id: clinicId, name: 'Normal Saline 0.9% 500ml', sku: sku('MED-SALINE-500'), barcode: barcode('8901000000010'), category: 'SURGICAL_SUPPLY', unit: 'bag', reorder_threshold: 10 },
        { clinic_id: clinicId, name: 'Disposable Syringe 5ml', sku: sku('MED-SYR-5ML'), barcode: barcode('8901000000027'), category: 'SURGICAL_SUPPLY', unit: 'each', reorder_threshold: 50 },
        { clinic_id: clinicId, name: 'IV Catheter 22G', sku: sku('MED-CATH-22G'), barcode: barcode('8901000000034'), category: 'SURGICAL_SUPPLY', unit: 'each', reorder_threshold: 20 },
        { clinic_id: clinicId, name: 'Surgical Gloves (pair)', sku: sku('MED-GLOVES-PR'), barcode: barcode('8901000000041'), category: 'SURGICAL_SUPPLY', unit: 'pair', reorder_threshold: 50 },
        { clinic_id: clinicId, name: 'Gauze Pads', sku: sku('MED-GAUZE'), barcode: barcode('8901000000058'), category: 'SURGICAL_SUPPLY', unit: 'pack', reorder_threshold: 20 },
        { clinic_id: clinicId, name: 'Amoxicillin 250mg', sku: sku('MED-AMOX-250'), barcode: barcode('8901000000065'), category: 'MEDICATION', unit: 'tablet', reorder_threshold: 100 },
        { clinic_id: clinicId, name: 'Meloxicam 1.5mg/ml', sku: sku('MED-MELOX-15'), barcode: barcode('8901000000072'), category: 'MEDICATION', unit: 'ml', reorder_threshold: 40 },
        { clinic_id: clinicId, name: 'Tramadol 50mg', sku: sku('MED-TRAM-50'), barcode: barcode('8901000000089'), category: 'MEDICATION', unit: 'tablet', reorder_threshold: 30, is_controlled: true },
        { clinic_id: clinicId, name: 'Rabies Vaccine', sku: sku('VAC-RABIES'), barcode: barcode('8901000000096'), category: 'VACCINE', unit: 'dose', reorder_threshold: 15 },
        { clinic_id: clinicId, name: 'DHPP Vaccine', sku: sku('VAC-DHPP'), barcode: barcode('8901000000102'), category: 'VACCINE', unit: 'dose', reorder_threshold: 15 },
        { clinic_id: clinicId, name: 'Digital Thermometer', sku: sku('EQ-THERM-DIG'), barcode: barcode('8901000000119'), category: 'EQUIPMENT', unit: 'each', reorder_threshold: 2 },
        { clinic_id: clinicId, name: 'Blood Glucose Test Strips', sku: sku('DIAG-GLUC-STRIP'), barcode: barcode('8901000000126'), category: 'DIAGNOSTIC_SUPPLY', unit: 'strip', reorder_threshold: 30 },
        { clinic_id: clinicId, name: 'Prescription Diet Food (dog, 5kg)', sku: sku('FOOD-RX-DOG5'), barcode: barcode('8901000000133'), category: 'FOOD', unit: 'bag', reorder_threshold: 5 },
        // Pet Shop (retail) items — sold at POS, never dispensed clinically.
        { clinic_id: clinicId, name: 'Premium Dog Shampoo 500ml', sku: sku('RTL-SHAMPOO-DOG'), barcode: barcode('8902000000010'), category: 'RETAIL', unit: 'bottle', reorder_threshold: 10 },
        { clinic_id: clinicId, name: 'Cat Litter 10L', sku: sku('RTL-LITTER-10L'), barcode: barcode('8902000000027'), category: 'RETAIL', unit: 'bag', reorder_threshold: 10 },
        { clinic_id: clinicId, name: 'Chew Toy - Rope', sku: sku('RTL-TOY-ROPE'), barcode: barcode('8902000000034'), category: 'RETAIL', unit: 'each', reorder_threshold: 15 },
        { clinic_id: clinicId, name: 'Pet Carrier (Small)', sku: sku('RTL-CARRIER-S'), barcode: barcode('8902000000041'), category: 'RETAIL', unit: 'each', reorder_threshold: 5 },
        { clinic_id: clinicId, name: 'Flea & Tick Collar', sku: sku('RTL-COLLAR-FT'), barcode: barcode('8902000000058'), category: 'RETAIL', unit: 'each', reorder_threshold: 10 },
      ],
    });
    console.log('✅ Created 18 inventory items (13 clinical + 5 Pet Shop retail)');
  } else {
    console.log(`ℹ️  Inventory already has ${inventoryCount} item(s)`);
  }

  const items = await prisma.inventoryItem.findMany({ where: { clinic_id: clinicId } });
  const itemByName = (name: string) => items.find((x) => x.name === name)!;

  // ── Goods Received Notes — every stock batch below comes from receiving
  //    a real GRN (see grn.service.ts's createGrn), never a bare StockBatch
  //    insert, matching the invariant documented on the StockBatch model. ──
  const grnCount = await prisma.goodsReceivedNote.count({ where: { clinic_id: clinicId } });

  if (grnCount === 0) {
    const clinicalItems = [
      'Normal Saline 0.9% 500ml', 'Disposable Syringe 5ml', 'IV Catheter 22G',
      'Surgical Gloves (pair)', 'Gauze Pads', 'Meloxicam 1.5mg/ml',
      'Tramadol 50mg', 'DHPP Vaccine', 'Digital Thermometer',
      'Blood Glucose Test Strips', 'Prescription Diet Food (dog, 5kg)',
    ];
    const clinicalQuantities: Record<string, number> = {
      'Normal Saline 0.9% 500ml': 50, 'Disposable Syringe 5ml': 200, 'IV Catheter 22G': 80,
      'Surgical Gloves (pair)': 300, 'Gauze Pads': 100, 'Meloxicam 1.5mg/ml': 200,
      'Tramadol 50mg': 150, 'DHPP Vaccine': 60, 'Digital Thermometer': 10,
      'Blood Glucose Test Strips': 150, 'Prescription Diet Food (dog, 5kg)': 30,
    };
    const expiryFor: Record<string, number> = {
      'Meloxicam 1.5mg/ml': 540, 'Tramadol 50mg': 730, 'DHPP Vaccine': 300,
      'Blood Glucose Test Strips': 240, 'Prescription Diet Food (dog, 5kg)': 180,
    };

    await createGrn(clinicId, nurseAmara.id, {
      supplier_name: 'VetSupply Lanka (Pvt) Ltd',
      supplier_invoice_no: 'VSL-INV-8841',
      notes: 'Initial stock intake',
      items: [
        ...clinicalItems.map((name) => {
          const [unit_cost, selling_price] = seedItemPricing[name] ?? [1, 1];
          return {
            item_id: itemByName(name).id,
            batch_no: 'LOT-2026-A',
            quantity: clinicalQuantities[name] ?? 20,
            unit_cost, selling_price, discount_percent: 0,
            ...(expiryFor[name] ? { expiry_date: isoDaysFromNow(expiryFor[name]) } : {}),
          };
        }),
        // Amoxicillin deliberately received in a smaller quantity (just above
        // its 100-unit reorder threshold) so Bella's 20-unit prescription
        // below crosses the threshold for real and triggers a genuine
        // low-stock notification — not a hand-set quantity_on_hand.
        {
          item_id: itemByName('Amoxicillin 250mg').id,
          batch_no: 'LOT-2026-A',
          quantity: 115,
          ...(() => { const [unit_cost, selling_price] = seedItemPricing['Amoxicillin 250mg']!; return { unit_cost, selling_price }; })(),
          discount_percent: 0,
          expiry_date: isoDaysFromNow(365),
        },
        // Rabies Vaccine's first batch is set to expire soon (within the
        // 30-day expiring-soon window) — the story: this batch is running
        // out, so it gets pinned away from below in favor of the fresh one.
        {
          item_id: itemByName('Rabies Vaccine').id,
          batch_no: 'LOT-2026-A',
          quantity: 60,
          ...(() => { const [unit_cost, selling_price] = seedItemPricing['Rabies Vaccine']!; return { unit_cost, selling_price }; })(),
          discount_percent: 0,
          expiry_date: isoDaysFromNow(25),
        },
      ],
    });
    console.log('✅ Received GRN #1 — initial clinical stock (VetSupply Lanka)');

    await createGrn(clinicId, nurseAmara.id, {
      supplier_name: 'Pawfect Pet Products',
      supplier_invoice_no: 'PPP-2299',
      notes: 'Initial Pet Shop retail stock',
      items: ['Premium Dog Shampoo 500ml', 'Cat Litter 10L', 'Chew Toy - Rope', 'Pet Carrier (Small)', 'Flea & Tick Collar'].map((name) => {
        const [unit_cost, selling_price] = seedItemPricing[name] ?? [1, 1];
        return { item_id: itemByName(name).id, batch_no: 'LOT-RETAIL-A', quantity: 40, unit_cost, selling_price, discount_percent: 0 };
      }),
    });
    console.log('✅ Received GRN #2 — initial Pet Shop retail stock (Pawfect Pet Products)');

    // A restock of Rabies Vaccine at a higher price, a few days ago — gives
    // the item a genuine second, still-open batch (LOT-2026-A above is the
    // first) so "Use this batch" on the Inventory item page has something
    // real to demonstrate, instead of every item having exactly one batch.
    const restockGrn = await createGrn(clinicId, nurseAmara.id, {
      supplier_name: 'VetSupply Lanka (Pvt) Ltd', // resolves to the same Supplier as GRN #1
      supplier_invoice_no: 'VSL-INV-9012',
      notes: 'Rabies vaccine restock — price increase from supplier',
      items: [{
        item_id: itemByName('Rabies Vaccine').id,
        batch_no: 'LOT-2026-B',
        quantity: 20,
        unit_cost: 4.5,
        selling_price: 28,
        discount_percent: 0,
        expiry_date: isoDaysFromNow(400),
      }],
    });
    console.log('✅ Received GRN #3 — Rabies Vaccine restock at a new price');

    const newRabiesBatch = restockGrn.items[0]!.batch!;
    await setPreferredBatch(itemByName('Rabies Vaccine').id, clinicId, newRabiesBatch.id, false);
    console.log('✅ Pinned Rabies Vaccine to its newer (LOT-2026-B) batch via "Use this batch"');
  } else {
    console.log(`ℹ️  ${grnCount} goods received note(s) already exist`);
  }

  // Create sample billable services
  const serviceCount = await prisma.service.count({ where: { clinic_id: clinicId } });

  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        { clinic_id: clinicId, name: 'General Consultation', category: 'exam', price: 45, duration_minutes: 20 },
        { clinic_id: clinicId, name: 'Wellness Exam', category: 'exam', price: 55, duration_minutes: 30 },
        { clinic_id: clinicId, name: 'Vaccination Administration', category: 'procedure', price: 20, duration_minutes: 10 },
        { clinic_id: clinicId, name: 'Dental Cleaning', category: 'procedure', price: 250, duration_minutes: 60 },
        { clinic_id: clinicId, name: 'Spay / Neuter Surgery', category: 'procedure', price: 350, duration_minutes: 90 },
        { clinic_id: clinicId, name: 'TPLO Surgery', category: 'procedure', price: 450, duration_minutes: 120 },
        { clinic_id: clinicId, name: 'Blood Panel', category: 'lab', price: 65, duration_minutes: 15 },
        { clinic_id: clinicId, name: 'X-Ray (single view)', category: 'lab', price: 85, duration_minutes: 20 },
        { clinic_id: clinicId, name: 'Full Grooming Package', category: 'grooming', price: 40, duration_minutes: 45 },
        { clinic_id: clinicId, name: 'Boarding (per night)', category: 'other', price: 25 },
      ],
    });
    console.log('✅ Created 10 sample services');
  } else {
    console.log(`ℹ️  Services already has ${serviceCount} entr${serviceCount === 1 ? 'y' : 'ies'}`);
  }
  const services = await prisma.service.findMany({ where: { clinic_id: clinicId } });
  const serviceByName = (name: string) => services.find((x) => x.name === name)!;

  // Create ward rooms and kennels
  const wardRoomCount = await prisma.room.count({ where: { clinic_id: clinicId, type: 'ward' } });

  if (wardRoomCount === 0) {
    const wardA = await prisma.room.create({ data: { clinic_id: clinicId, name: 'Ward A', type: 'ward' } });
    const wardB = await prisma.room.create({ data: { clinic_id: clinicId, name: 'Ward B', type: 'ward' } });

    await prisma.kennelUnit.createMany({
      data: [
        { room_id: wardA.id, label: 'K-01', size: 'small' },
        { room_id: wardA.id, label: 'K-02', size: 'small' },
        { room_id: wardA.id, label: 'K-03', size: 'medium' },
        { room_id: wardA.id, label: 'K-04', size: 'medium' },
        { room_id: wardB.id, label: 'K-05', size: 'large' },
        { room_id: wardB.id, label: 'K-06', size: 'large' },
        { room_id: wardB.id, label: 'Cat Suite 1', size: 'small' },
        { room_id: wardB.id, label: 'Cat Suite 2', size: 'small' },
      ],
    });
    console.log('✅ Created 2 ward rooms with 8 kennels');
  } else {
    console.log(`ℹ️  Ward rooms already exist (${wardRoomCount})`);
  }
  const kennels = await prisma.kennelUnit.findMany({ where: { room: { clinic_id: clinicId } } });
  const kennelByLabel = (label: string) => kennels.find((x) => x.label === label)!;

  // ── Demo scenario: owners, pets, a realistic week of appointments ─────────
  const ownerCount = await prisma.owner.count({ where: { clinic_id: clinicId } });

  if (ownerCount === 0) {
    async function makeOwnerWithPets(
      owner: { first_name: string; last_name: string; phone: string; email: string; address: string },
      pets: Array<{ name: string; species: string; breed: string; sex: string; weight_kg: number; dobYears: number }>,
    ) {
      const created = await prisma.owner.create({
        data: { clinic_id: clinicId, ...owner, preferred_contact: 'email' },
      });
      const createdPets = [];
      for (const p of pets) {
        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - p.dobYears);
        createdPets.push(
          await prisma.pet.create({
            data: {
              owner_id: created.id, name: p.name, species: p.species as never,
              breed: p.breed, sex: p.sex, weight_kg: p.weight_kg, date_of_birth: dob,
            },
          }),
        );
      }
      return { owner: created, pets: createdPets };
    }

    async function completedVisit(params: {
      petId: string; vetId: string; type: string; daysAgo: number; reason: string;
      chiefComplaint: string;
      vitals: { weight_kg: number; temperature_c: number; heart_rate_bpm: number; respiratory_rate: number; body_condition_score: number };
      soap: { note: string };
      diagnosis?: { code?: string; name: string };
    }) {
      const start = daysFromNow(-params.daysAgo, 10, 0);
      const end = daysFromNow(-params.daysAgo, 10, 30);
      const appointment = await prisma.appointment.create({
        data: {
          clinic_id: clinicId, pet_id: params.petId, vet_id: params.vetId,
          type: params.type as never, status: 'COMPLETED', start_at: start, end_at: end,
          reason: params.reason, checked_in_at: start,
        },
      });
      const medicalRecord = await prisma.medicalRecord.create({
        data: {
          pet_id: params.petId, appointment_id: appointment.id, vet_id: params.vetId,
          visit_date: start, chief_complaint: params.chiefComplaint,
        },
      });
      await prisma.vitals.create({ data: { medical_record_id: medicalRecord.id, ...params.vitals } });
      await prisma.soapNote.create({ data: { medical_record_id: medicalRecord.id, vet_id: params.vetId, ...params.soap } });
      if (params.diagnosis) {
        await prisma.diagnosis.create({ data: { medical_record_id: medicalRecord.id, is_primary: true, ...params.diagnosis } });
      }
      return { appointment, medicalRecord };
    }

    // Owners + pets
    const { pets: [rocky] } = await makeOwnerWithPets(
      { first_name: 'Chamara', last_name: 'Rathnayake', phone: '+94 77 123 4567', email: ownerEmail('chamara.r'), address: '45 Galle Road, Colombo 03' },
      [{ name: 'Rocky', species: 'DOG', breed: 'Labrador Retriever', sex: 'M', weight_kg: 28, dobYears: 3 }],
    );
    const { owner: priyanka, pets: [luna, max] } = await makeOwnerWithPets(
      { first_name: 'Priyanka', last_name: 'Jayawardena', phone: '+94 71 234 5678', email: ownerEmail('priyanka.j'), address: '12 Havelock Road, Colombo 05' },
      [
        { name: 'Luna', species: 'CAT', breed: 'Persian', sex: 'F_SPAYED', weight_kg: 4.2, dobYears: 2 },
        { name: 'Max', species: 'DOG', breed: 'Beagle', sex: 'M_NEUTERED', weight_kg: 12, dobYears: 5 },
      ],
    );
    const { owner: kasun, pets: [bella] } = await makeOwnerWithPets(
      { first_name: 'Kasun', last_name: 'Wijesinghe', phone: '+94 76 345 6789', email: ownerEmail('kasun.w'), address: '78 High Level Road, Nugegoda' },
      [{ name: 'Bella', species: 'DOG', breed: 'German Shepherd', sex: 'F', weight_kg: 28, dobYears: 4 }],
    );
    const { owner: nimali, pets: [whiskers] } = await makeOwnerWithPets(
      { first_name: 'Nimali', last_name: 'Gunasekara', phone: '+94 70 456 7890', email: ownerEmail('nimali.g'), address: '9 Kandy Road, Kadawatha' },
      [{ name: 'Whiskers', species: 'CAT', breed: 'Domestic Shorthair', sex: 'F_SPAYED', weight_kg: 3.8, dobYears: 6 }],
    );
    const { owner: sanjeewa, pets: [coco] } = await makeOwnerWithPets(
      { first_name: 'Sanjeewa', last_name: 'Dissanayake', phone: '+94 75 567 8901', email: ownerEmail('sanjeewa.d'), address: '221 Negombo Road, Wattala' },
      [{ name: 'Coco', species: 'RABBIT', breed: 'Holland Lop', sex: 'M_NEUTERED', weight_kg: 1.8, dobYears: 1 }],
    );
    const { pets: [buddy, tweety] } = await makeOwnerWithPets(
      { first_name: 'Tharushi', last_name: 'Fernando', phone: '+94 72 678 9012', email: ownerEmail('tharushi.f'), address: '33 Baseline Road, Colombo 09' },
      [
        { name: 'Buddy', species: 'DOG', breed: 'Poodle', sex: 'M', weight_kg: 8, dobYears: 2 },
        { name: 'Tweety', species: 'BIRD', breed: 'Budgerigar', sex: 'M', weight_kg: 0.03, dobYears: 1 },
      ],
    );

    console.log('✅ Created 6 owners with 8 pets');

    // Allergies
    await prisma.allergy.createMany({
      data: [
        { pet_id: rocky.id, allergen: 'Chicken protein', reaction: 'Skin irritation and itching', severity: 'mild' },
        { pet_id: bella.id, allergen: 'Penicillin', reaction: 'Vomiting', severity: 'moderate' },
      ],
    });

    // Historical vaccinations — pure documentation records (reported by the
    // owner or given before this system was in use), no item/service/charge.
    await prisma.vaccination.create({
      data: { pet_id: rocky.id, vaccine_name: 'Rabies', administered_at: daysFromNow(-335), next_due_at: daysFromNow(30), administered_by: drSmith.id },
    });
    const maxVax = await prisma.vaccination.create({
      data: { pet_id: max.id, vaccine_name: 'DHPP', administered_at: daysFromNow(-395), next_due_at: daysFromNow(-30), administered_by: drCarter.id },
    });
    await prisma.vaccination.create({
      data: { pet_id: bella.id, vaccine_name: 'Rabies', administered_at: daysFromNow(-240), next_due_at: daysFromNow(125), administered_by: drCarter.id },
    });
    await prisma.vaccination.create({
      data: { pet_id: buddy.id, vaccine_name: 'Rabies', administered_at: daysFromNow(-180), next_due_at: daysFromNow(185), administered_by: drSmith.id },
    });

    // ── Completed visits — charges/vaccinations/prescriptions all go through
    //    the same emr.service.ts functions the real EMR screen calls, so
    //    invoices, stock deductions, and charge<->record links are all real. ──

    const luVisit = await completedVisit({
      petId: luna.id, vetId: drSmith.id, type: 'WELLNESS_EXAM', daysAgo: 2,
      reason: 'Annual wellness check', chiefComplaint: 'Annual wellness check',
      vitals: { weight_kg: 4.2, temperature_c: 38.5, heart_rate_bpm: 180, respiratory_rate: 30, body_condition_score: 5 },
      soap: { note: 'Owner reports normal appetite and activity, no concerns. Alert, well-hydrated, coat in good condition. Heart and lungs clear on auscultation. Healthy adult cat, no abnormalities noted. Continue current diet, annual booster administered today, recheck in 12 months.' },
    });
    await addCharge(luVisit.medicalRecord.id, clinicId, drSmith.id, { service_id: serviceByName('Wellness Exam').id, quantity: 1 });
    await addCharge(luVisit.medicalRecord.id, clinicId, drSmith.id, { service_id: serviceByName('Vaccination Administration').id, quantity: 1 });
    // Bills off whichever batch is preferred (LOT-2026-B, 28/dose) — proves
    // the vaccination picker/price flow respects "Use this batch", not FIFO.
    await addVaccination(luVisit.medicalRecord.id, clinicId, drSmith.id, {
      vaccine_name: 'Rabies', administered_at: daysFromNow(-2).toISOString(), next_due_at: daysFromNow(363).toISOString(),
      item_id: itemByName('Rabies Vaccine').id,
    });
    const luInvoice = await prisma.invoice.findUniqueOrThrow({ where: { appointment_id: luVisit.appointment.id } });
    await recordPayment(luInvoice.id, clinicId, { amount: Number(luInvoice.total), method: 'cash' }, drSmith.id);

    const wVisit = await completedVisit({
      petId: whiskers.id, vetId: drSmith.id, type: 'VACCINATION', daysAgo: 5,
      reason: 'Annual booster vaccination', chiefComplaint: 'Annual booster vaccination',
      vitals: { weight_kg: 3.8, temperature_c: 38.3, heart_rate_bpm: 170, respiratory_rate: 28, body_condition_score: 5 },
      soap: { note: 'No concerns reported by owner. Healthy, active, normal exam findings. Healthy, vaccination administered without complication. Next booster due in 12 months.' },
    });
    await addCharge(wVisit.medicalRecord.id, clinicId, drSmith.id, { service_id: serviceByName('Vaccination Administration').id, quantity: 1 });
    await addVaccination(wVisit.medicalRecord.id, clinicId, drSmith.id, {
      vaccine_name: 'DHPP', administered_at: daysFromNow(-5).toISOString(), next_due_at: daysFromNow(360).toISOString(),
      item_id: itemByName('DHPP Vaccine').id,
    });
    const wInvoice = await prisma.invoice.findUniqueOrThrow({ where: { appointment_id: wVisit.appointment.id } });
    await recordPayment(wInvoice.id, clinicId, { amount: Number(wInvoice.total), method: 'cash' }, drSmith.id);

    const coVisit = await completedVisit({
      petId: coco.id, vetId: drSmith.id, type: 'WELLNESS_EXAM', daysAgo: 7,
      reason: 'General wellness check', chiefComplaint: 'General wellness check for rabbit',
      vitals: { weight_kg: 1.8, temperature_c: 38.9, heart_rate_bpm: 200, respiratory_rate: 40, body_condition_score: 5 },
      soap: { note: 'Eating well, normal droppings, no concerns. Alert, teeth in good condition, no nasal discharge. Healthy rabbit. Routine care, recheck in 6 months.' },
    });
    await addCharge(coVisit.medicalRecord.id, clinicId, drSmith.id, { service_id: serviceByName('General Consultation').id, quantity: 1 });
    const coInvoice = await prisma.invoice.findUniqueOrThrow({ where: { appointment_id: coVisit.appointment.id } });
    await updateInvoice(coInvoice.id, clinicId, { due_date: daysFromNow(-2).toISOString(), discount_amount: 0 });
    await updateStatus(coInvoice.id, clinicId, 'SENT');
    await updateStatus(coInvoice.id, clinicId, 'OVERDUE');

    // Bella — surgical case: completed visit, abnormal lab, hospitalization,
    // a normal (billed) prescription, and a *controlled* prescription that
    // stays pending — a real Controlled Substance Approval to act on live.
    const beVisit = await completedVisit({
      petId: bella.id, vetId: drCarter.id, type: 'SICK_VISIT', daysAgo: 3,
      reason: 'Limping on right hind leg', chiefComplaint: 'Limping on right hind leg, suspected ligament injury',
      vitals: { weight_kg: 28, temperature_c: 39.1, heart_rate_bpm: 110, respiratory_rate: 24, body_condition_score: 6 },
      soap: { note: 'Owner noticed limping after play at the park two days ago, worsening. Pain on palpation of right stifle, positive cranial drawer sign, mild joint effusion. Cranial cruciate ligament rupture, right hind limb. TPLO surgery performed same day. Post-op pain management and hospitalization for recovery monitoring.' },
      diagnosis: { code: 'VeNom-1234', name: 'Cranial Cruciate Ligament Rupture (right hind)' },
    });

    const beLabOrder = await prisma.labOrder.create({
      data: { pet_id: bella.id, ordered_by: drCarter.id, panel_name: 'Pre-Surgical Blood Panel', status: 'COMPLETED', ordered_at: daysFromNow(-3, 8, 0), completed_at: daysFromNow(-3, 9, 0) },
    });
    await prisma.labResult.createMany({
      data: [
        { lab_order_id: beLabOrder.id, medical_record_id: beVisit.medicalRecord.id, test_name: 'White Blood Cell Count', value: '18.2', unit: 'x10^9/L', reference_min: '6.0', reference_max: '17.0', is_abnormal: true },
        { lab_order_id: beLabOrder.id, medical_record_id: beVisit.medicalRecord.id, test_name: 'Hematocrit', value: '42', unit: '%', reference_min: '37', reference_max: '55', is_abnormal: false },
      ],
    });

    await addCharge(beVisit.medicalRecord.id, clinicId, drCarter.id, { service_id: serviceByName('TPLO Surgery').id, quantity: 1 });
    await addCharge(beVisit.medicalRecord.id, clinicId, drCarter.id, { service_id: serviceByName('Blood Panel').id, quantity: 1 });
    await addCharge(beVisit.medicalRecord.id, clinicId, drCarter.id, { service_id: serviceByName('X-Ray (single view)').id, quantity: 1 });
    await addCharge(beVisit.medicalRecord.id, clinicId, drCarter.id, { item_id: itemByName('IV Catheter 22G').id, quantity: 1 });
    await addCharge(beVisit.medicalRecord.id, clinicId, drCarter.id, { item_id: itemByName('Normal Saline 0.9% 500ml').id, quantity: 2 });

    // Non-controlled — bills and deducts stock immediately (and, since the
    // 115-unit GRN above only just cleared the 100-unit threshold, this
    // 20-unit dispense crosses it for real, firing a genuine low-stock alert).
    await addPrescription(beVisit.medicalRecord.id, clinicId, drCarter.id, {
      drug_name: 'Amoxicillin 250mg', dosage: '250mg', frequency: 'Twice daily', duration_days: 10,
      quantity: 20, refills_remaining: 0, item_id: itemByName('Amoxicillin 250mg').id,
      dispensed_at: daysFromNow(-3).toISOString(),
    });

    // Controlled substance — is_controlled defers billing/dispensing behind
    // a ControlledSubstanceApproval instead, left PENDING here on purpose so
    // there's a live request to approve/reject during the demo.
    await addPrescription(beVisit.medicalRecord.id, clinicId, drCarter.id, {
      drug_name: 'Tramadol 50mg', dosage: '50mg', frequency: 'Every 8 hours', duration_days: 5,
      quantity: 10, refills_remaining: 0, item_id: itemByName('Tramadol 50mg').id,
    });

    const beInvoice = await prisma.invoice.findUniqueOrThrow({ where: { appointment_id: beVisit.appointment.id } });
    await recordPayment(beInvoice.id, clinicId, { amount: 300, method: 'card' }, drCarter.id);

    const k03 = kennelByLabel('K-03');
    const bellaHosp = await prisma.hospitalization.create({
      data: { pet_id: bella.id, kennel_id: k03.id, admitted_by: drCarter.id, reason: 'Post-TPLO surgery recovery and monitoring', admitted_at: daysFromNow(-3, 12, 0), estimated_stay_days: 5 },
    });
    await prisma.kennelUnit.update({ where: { id: k03.id }, data: { status: 'OCCUPIED' } });
    await prisma.careLog.createMany({
      data: [
        { hospitalization_id: bellaHosp.id, performed_by: nurseAmara.id, type: 'vitals', notes: 'Vitals stable, temp 38.9°C, alert and responsive.', logged_at: daysFromNow(-2, 8, 0) },
        { hospitalization_id: bellaHosp.id, performed_by: nurseAmara.id, type: 'medication', notes: 'Administered Tramadol 50mg for post-operative pain management.', logged_at: daysFromNow(-2, 14, 0) },
        { hospitalization_id: bellaHosp.id, performed_by: nurseAmara.id, type: 'feeding', notes: 'Ate half portion of prescription diet, encouraged more water intake.', logged_at: daysFromNow(-1, 18, 0) },
      ],
    });

    console.log('✅ Created 4 completed visits with SOAP notes, invoices, a lab result, a pending controlled-substance approval, and an active hospitalization');

    // ── A manually-created invoice (the "New Invoice" flow, not visit-triggered) ──
    const boardingInvoice = await createInvoice(clinicId, { owner_id: kasun.id, due_date: daysFromNow(10).toISOString(), discount_amount: 0 });
    await addLineItem(boardingInvoice.id, clinicId, { service_id: serviceByName('Boarding (per night)').id, description: 'Boarding (per night)', quantity: 3, unit_price: 25 });
    await updateStatus(boardingInvoice.id, clinicId, 'SENT');
    console.log('✅ Created a standalone invoice via the manual New Invoice flow (Boarding, 3 nights)');

    // ── Pet Shop / POS — a couple of sales and one partial return ─────────────
    const sale1 = await createSale(clinicId, receptionist.id, {
      customer_name: 'Walk-in Customer',
      items: [
        { item_id: itemByName('Premium Dog Shampoo 500ml').id, quantity: 1 },
        { item_id: itemByName('Flea & Tick Collar').id, quantity: 1 },
      ],
      payment_method: 'cash', discount_amount: 0, amount_tendered: 20,
    });
    await createSale(clinicId, receptionist.id, {
      owner_id: priyanka.id,
      items: [
        { item_id: itemByName('Cat Litter 10L').id, quantity: 2 },
        { item_id: itemByName('Chew Toy - Rope').id, quantity: 1 },
      ],
      payment_method: 'card', discount_amount: 0,
    });
    const sale1FleaLine = sale1.line_items.find((li) => li.item?.id === itemByName('Flea & Tick Collar').id)!;
    await processReturn(clinicId, receptionist.id, sale1.id, {
      lines: [{ line_item_id: sale1FleaLine.id, quantity: 1 }],
      reason: 'Wrong size', refund_method: 'cash',
    });
    console.log('✅ Created 2 Pet Shop POS sales and 1 return');

    // ── Upcoming / in-progress / cancelled appointments (no medical record yet) ──
    await prisma.appointment.create({
      data: { clinic_id: clinicId, pet_id: rocky.id, vet_id: drSmith.id, type: 'SICK_VISIT', status: 'CHECKED_IN', is_walk_in: true, start_at: daysFromNow(0, 9, 0), end_at: daysFromNow(0, 9, 30), checked_in_at: new Date(), reason: 'Itchy skin, possible allergy flare-up' },
    });
    await prisma.appointment.create({
      data: { clinic_id: clinicId, pet_id: max.id, vet_id: drCarter.id, type: 'WELLNESS_EXAM', status: 'SCHEDULED', start_at: daysFromNow(0, 14, 0), end_at: daysFromNow(0, 14, 30), reason: 'Annual check-up' },
    });
    await prisma.appointment.create({
      data: { clinic_id: clinicId, pet_id: buddy.id, vet_id: drSmith.id, type: 'DENTAL', status: 'CONFIRMED', start_at: daysFromNow(1, 10, 0), end_at: daysFromNow(1, 11, 0), reason: 'Dental cleaning' },
    });
    await prisma.appointment.create({
      data: { clinic_id: clinicId, pet_id: tweety.id, vet_id: drCarter.id, type: 'WELLNESS_EXAM', status: 'SCHEDULED', start_at: daysFromNow(2, 11, 0), end_at: daysFromNow(2, 11, 20), reason: 'First wellness visit' },
    });
    await prisma.appointment.create({
      data: { clinic_id: clinicId, pet_id: rocky.id, vet_id: drSmith.id, type: 'FOLLOW_UP', status: 'SCHEDULED', start_at: daysFromNow(4, 9, 30), end_at: daysFromNow(4, 9, 50), reason: 'Follow-up on skin allergy' },
    });
    await prisma.appointment.create({
      data: { clinic_id: clinicId, pet_id: max.id, vet_id: drSmith.id, type: 'GROOMING', status: 'CANCELLED', start_at: daysFromNow(-2, 13, 0), end_at: daysFromNow(-2, 13, 45), reason: 'Grooming', cancelled_at: daysFromNow(-3), cancel_reason: 'Owner rescheduled due to conflict' },
    });
    await prisma.appointment.create({
      data: { clinic_id: clinicId, pet_id: coco.id, vet_id: drCarter.id, type: 'DENTAL', status: 'NO_SHOW', start_at: daysFromNow(-4, 15, 0), end_at: daysFromNow(-4, 15, 30), reason: 'Teeth check' },
    });
    console.log('✅ Created 7 additional appointments (checked-in, scheduled, cancelled, no-show)');

    // ── A few illustrative notifications (cron-generated types, so there's
    //    no live trigger to run here) — inserted directly, never through
    //    notifyOwner, so nothing is actually emailed to these example addresses. ──
    await prisma.notification.createMany({
      data: [
        {
          owner_id: priyanka.id, type: 'vaccine_due_reminder_30d', channel: 'email',
          subject: 'Vaccine Reminder for Max', body: `Max's DHPP booster was due on ${maxVax.next_due_at?.toDateString()} — please book a follow-up visit.`,
          status: 'SENT', sent_at: daysFromNow(-25), reference_id: `${maxVax.id}:30d`,
        },
        {
          owner_id: sanjeewa.id, type: 'invoice_overdue_alert', channel: 'email',
          subject: 'Invoice Overdue', body: "Your invoice for Coco's recent visit is now overdue. Please settle at your earliest convenience.",
          status: 'SENT', sent_at: daysFromNow(-1), reference_id: coInvoice.id,
        },
        {
          staff_id: admin.id, type: 'daily_digest', channel: 'in_app',
          subject: "Today's Digest", body: '2 appointments today, 1 low-stock alert, 1 controlled-substance approval pending.',
          status: 'SENT', sent_at: daysFromNow(0, 7, 0),
        },
      ],
    });
    console.log('✅ Created 3 illustrative notifications');
  } else {
    console.log(`ℹ️  Demo scenario already seeded (${ownerCount} owner(s) exist)`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log(`   Admin:          ${adminEmail}${adminWasCreated ? '  / Admin@123' : '  (existing account — use its own password)'}`);
  console.log(`   Veterinarian:   ${vetEmail}  / Vet@123456`);
  console.log(`   Veterinarian:   dr.carter@${emailDomain}  / Vet@123456`);
  console.log(`   Nurse:          nurse.amara@${emailDomain}  / Nurse@123456`);
  console.log(`   Receptionist:   receptionist@${emailDomain}  / Front@123456`);
  console.log(`   Lab Technician: labtech@${emailDomain}  / Lab@123456`);
  console.log('\n⚠️  Change these passwords immediately after first login!\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // The service-layer functions above use their own PrismaClient
    // (server/src/lib/prisma.ts) — disconnect it too, or its open pg
    // connection keeps this script's process alive after seeding finishes.
    await sharedPrisma.$disconnect();
  });
