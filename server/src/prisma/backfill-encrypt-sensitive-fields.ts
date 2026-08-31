// One-off script to encrypt existing plaintext values in the three fields
// that lib/encryption.ts now protects: Owner.emergency_contact,
// Pet.insurance_id, and StaffUser.license_number. Run once after deploying
// the encryption feature — new writes are encrypted automatically going
// forward, but rows written before that point are still plaintext until
// this runs.
//
// Usage:
//   pnpm --filter server db:backfill-encrypt-sensitive-fields
//
// Safe to run more than once — a value already in the encrypted format is
// skipped.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { encrypt, isEncrypted } from '../lib/encryption';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

async function backfill<T extends { id: string }>(
  label: string,
  rows: T[],
  getValue: (row: T) => string | null,
  update: (id: string, encrypted: string) => Promise<unknown>,
) {
  let count = 0;
  for (const row of rows) {
    const value = getValue(row);
    if (!value || isEncrypted(value)) continue;
    await update(row.id, encrypt(value)!);
    count += 1;
  }
  console.log(`✅ ${label}: encrypted ${count} of ${rows.length} candidate row(s)`);
}

async function main() {
  console.log('🔒 Backfilling encryption for sensitive fields...');

  const owners = await prisma.owner.findMany({
    where: { emergency_contact: { not: null } },
    select: { id: true, emergency_contact: true },
  });
  await backfill(
    'Owner.emergency_contact',
    owners,
    (o) => o.emergency_contact,
    (id, value) => prisma.owner.update({ where: { id }, data: { emergency_contact: value } }),
  );

  const pets = await prisma.pet.findMany({
    where: { insurance_id: { not: null } },
    select: { id: true, insurance_id: true },
  });
  await backfill(
    'Pet.insurance_id',
    pets,
    (p) => p.insurance_id,
    (id, value) => prisma.pet.update({ where: { id }, data: { insurance_id: value } }),
  );

  const staff = await prisma.staffUser.findMany({
    where: { license_number: { not: null } },
    select: { id: true, license_number: true },
  });
  await backfill(
    'StaffUser.license_number',
    staff,
    (s) => s.license_number,
    (id, value) => prisma.staffUser.update({ where: { id }, data: { license_number: value } }),
  );

  console.log('🎉 Backfill complete!');
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
