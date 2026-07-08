import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'dotenv -e ../.env -- ts-node -r tsconfig-paths/register src/prisma/seed.ts',
  },
});
