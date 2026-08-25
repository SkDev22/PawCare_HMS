// One-off script to assign invoice_number to invoices created before that
// column existed. Run once after applying the migration that adds
// invoice_number/tax_auto to Invoice and tax_rate/invoice_prefix/
// invoice_next_number/invoice_due_days/invoice_footer_text to Clinic.
//
// Usage:
//   pnpm --filter server db:backfill-invoice-numbers
//
// Safe to run more than once — invoices that already have a number are
// skipped, and each clinic's invoice_next_number is only ever moved forward.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔢 Backfilling invoice numbers...');

  const clinics = await prisma.clinic.findMany({
    select: { id: true, invoice_prefix: true, invoice_next_number: true },
  });

  for (const clinic of clinics) {
    const unnumbered = await prisma.invoice.findMany({
      where: { clinic_id: clinic.id, invoice_number: null },
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });

    if (unnumbered.length === 0) continue;

    let next = clinic.invoice_next_number;
    for (const invoice of unnumbered) {
      const invoiceNumber = `${clinic.invoice_prefix}${String(next).padStart(5, '0')}`;
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { invoice_number: invoiceNumber },
      });
      next += 1;
    }

    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { invoice_next_number: next },
    });

    console.log(`✅ Clinic ${clinic.id}: numbered ${unnumbered.length} invoice(s), next is now ${next}`);
  }

  console.log('🎉 Backfill complete!');
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
