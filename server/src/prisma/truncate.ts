import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Truncating all tables (schema and migration history are kept)...');

  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
      )
      LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);

  console.log('✅ All tables truncated. Schema and migrations are untouched.');
}

main()
  .catch((err) => {
    console.error('❌ Truncate failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
