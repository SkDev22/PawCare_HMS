import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  client.$on('error', (e) => {
    logger.error('Prisma error', { message: e.message, target: e.target });
  });

  client.$on('warn', (e) => {
    logger.warn('Prisma warning', { message: e.message, target: e.target });
  });

  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
