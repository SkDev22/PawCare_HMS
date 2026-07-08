import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create the default clinic
  let clinic = await prisma.clinic.findFirst();

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        name: 'PawCare Animal Hospital',
        email: 'clinic@pawcare.vet',
        phone: '+1-555-0100',
        address: '123 Vet Lane, Springfield',
        timezone: 'America/New_York',
        currency: 'LKR',
      },
    });
    console.log(`✅ Created clinic: ${clinic.name} (${clinic.id})`);
  } else {
    console.log(`ℹ️  Clinic already exists: ${clinic.name}`);
  }

  // Create default admin user
  const adminEmail = 'admin@pawcare.vet';
  const existingAdmin = await prisma.staffUser.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.staffUser.create({
      data: {
        clinic_id: clinic.id,
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
  const vetEmail = 'dr.smith@pawcare.vet';
  const existingVet = await prisma.staffUser.findUnique({ where: { email: vetEmail } });

  if (!existingVet) {
    const passwordHash = await bcrypt.hash('Vet@123456', 12);
    await prisma.staffUser.create({
      data: {
        clinic_id: clinic.id,
        email: vetEmail,
        password_hash: passwordHash,
        first_name: 'Sarah',
        last_name: 'Smith',
        role: 'VETERINARIAN',
        specialization: 'Small animals',
        license_number: 'VET-2024-001',
      },
    });
    console.log(`✅ Created veterinarian: ${vetEmail}`);
  }

  // Create sample inventory items (drugs, vaccines, supplies, equipment)
  const inventoryCount = await prisma.inventoryItem.count({ where: { clinic_id: clinic.id } });

  if (inventoryCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { clinic_id: clinic.id, name: 'Normal Saline 0.9% 500ml', category: 'SURGICAL_SUPPLY', unit: 'bag', unit_cost: 3.5, selling_price: 12, quantity_on_hand: 50, reorder_threshold: 10 },
        { clinic_id: clinic.id, name: 'Disposable Syringe 5ml', category: 'SURGICAL_SUPPLY', unit: 'each', unit_cost: 0.2, selling_price: 1.5, quantity_on_hand: 200, reorder_threshold: 50 },
        { clinic_id: clinic.id, name: 'IV Catheter 22G', category: 'SURGICAL_SUPPLY', unit: 'each', unit_cost: 1.2, selling_price: 6, quantity_on_hand: 80, reorder_threshold: 20 },
        { clinic_id: clinic.id, name: 'Surgical Gloves (pair)', category: 'SURGICAL_SUPPLY', unit: 'pair', unit_cost: 0.3, selling_price: 2, quantity_on_hand: 300, reorder_threshold: 50 },
        { clinic_id: clinic.id, name: 'Gauze Pads', category: 'SURGICAL_SUPPLY', unit: 'pack', unit_cost: 1.5, selling_price: 5, quantity_on_hand: 100, reorder_threshold: 20 },
        { clinic_id: clinic.id, name: 'Amoxicillin 250mg', category: 'MEDICATION', unit: 'tablet', unit_cost: 0.4, selling_price: 2, quantity_on_hand: 500, reorder_threshold: 100 },
        { clinic_id: clinic.id, name: 'Meloxicam 1.5mg/ml', category: 'MEDICATION', unit: 'ml', unit_cost: 0.6, selling_price: 3, quantity_on_hand: 200, reorder_threshold: 40 },
        { clinic_id: clinic.id, name: 'Tramadol 50mg', category: 'MEDICATION', unit: 'tablet', unit_cost: 0.5, selling_price: 2.5, quantity_on_hand: 150, reorder_threshold: 30, is_controlled: true },
        { clinic_id: clinic.id, name: 'Rabies Vaccine', category: 'VACCINE', unit: 'dose', unit_cost: 4, selling_price: 25, quantity_on_hand: 60, reorder_threshold: 15 },
        { clinic_id: clinic.id, name: 'DHPP Vaccine', category: 'VACCINE', unit: 'dose', unit_cost: 5, selling_price: 30, quantity_on_hand: 60, reorder_threshold: 15 },
        { clinic_id: clinic.id, name: 'Digital Thermometer', category: 'EQUIPMENT', unit: 'each', unit_cost: 15, quantity_on_hand: 10, reorder_threshold: 2 },
        { clinic_id: clinic.id, name: 'Blood Glucose Test Strips', category: 'DIAGNOSTIC_SUPPLY', unit: 'strip', unit_cost: 0.8, selling_price: 4, quantity_on_hand: 150, reorder_threshold: 30 },
        { clinic_id: clinic.id, name: 'Prescription Diet Food (dog, 5kg)', category: 'FOOD', unit: 'bag', unit_cost: 20, selling_price: 45, quantity_on_hand: 30, reorder_threshold: 5 },
      ],
    });
    console.log('✅ Created 13 sample inventory items');
  } else {
    console.log(`ℹ️  Inventory already has ${inventoryCount} item(s)`);
  }

  // Create sample billable services
  const serviceCount = await prisma.service.count({ where: { clinic_id: clinic.id } });

  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        { clinic_id: clinic.id, name: 'General Consultation', category: 'exam', price: 45, duration_minutes: 20 },
        { clinic_id: clinic.id, name: 'Wellness Exam', category: 'exam', price: 55, duration_minutes: 30 },
        { clinic_id: clinic.id, name: 'Vaccination Administration', category: 'procedure', price: 20, duration_minutes: 10 },
        { clinic_id: clinic.id, name: 'Dental Cleaning', category: 'procedure', price: 250, duration_minutes: 60 },
        { clinic_id: clinic.id, name: 'Spay / Neuter Surgery', category: 'procedure', price: 350, duration_minutes: 90 },
        { clinic_id: clinic.id, name: 'Blood Panel', category: 'lab', price: 65, duration_minutes: 15 },
        { clinic_id: clinic.id, name: 'X-Ray (single view)', category: 'lab', price: 85, duration_minutes: 20 },
        { clinic_id: clinic.id, name: 'Full Grooming Package', category: 'grooming', price: 40, duration_minutes: 45 },
      ],
    });
    console.log('✅ Created 8 sample services');
  } else {
    console.log(`ℹ️  Services already has ${serviceCount} entr${serviceCount === 1 ? 'y' : 'ies'}`);
  }

  // Create ward rooms and kennels
  const wardRoomCount = await prisma.room.count({ where: { clinic_id: clinic.id, type: 'ward' } });

  if (wardRoomCount === 0) {
    const wardA = await prisma.room.create({
      data: { clinic_id: clinic.id, name: 'Ward A', type: 'ward' },
    });
    const wardB = await prisma.room.create({
      data: { clinic_id: clinic.id, name: 'Ward B', type: 'ward' },
    });

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

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Default login credentials:');
  console.log('   Admin:       admin@pawcare.vet  / Admin@123');
  console.log('   Veterinarian: dr.smith@pawcare.vet / Vet@123456');
  console.log('\n⚠️  Change these passwords immediately after first login!\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
