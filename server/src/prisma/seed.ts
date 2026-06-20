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
        currency: 'USD',
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
