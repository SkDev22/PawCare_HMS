import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { logger } from './lib/logger';
import { initSocket } from './lib/socket';
import { initWorker, registerRepeatableJobs, closeWorker } from './jobs/worker';

// BullMQ's Queue (constructed at import time in ./lib/queue, pulled in
// transitively via ./jobs/worker below) eagerly starts connecting the shared
// `redis` instance as soon as it's constructed — before this function runs.
// So `redis.status` may already be 'connecting' by the time we get here;
// calling `.connect()` again throws ("already connecting/connected").
async function ensureRedisReady() {
  if (redis.status === 'ready') return;
  if (redis.status === 'wait') {
    await redis.connect();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    redis.once('ready', () => resolve());
    redis.once('error', reject);
  });
}

async function start() {
  try {
    // Verify DB connection
    await prisma.$connect();
    logger.info('Database connected');

    // Verify Redis connection
    await ensureRedisReady();

    const httpServer = http.createServer(app);
    initSocket(httpServer);
    initWorker();
    await registerRepeatableJobs();

    const server = httpServer.listen(env.PORT, () => {
      logger.info(`PawCare HMS server running`, {
        port: env.PORT,
        env: env.NODE_ENV,
        url: `http://localhost:${env.PORT}`,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received â€” shutting down gracefully`);
      server.close(async () => {
        await closeWorker();
        await prisma.$disconnect();
        redis.disconnect();
        logger.info('Server shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    // Error instances don't JSON-serialize their message/stack when nested
    // under a metadata key — Winston's json() formatter only unwraps errors
    // passed as the top-level log argument, not ones buried in an object.
    logger.error('Failed to start server', {
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    process.exit(1);
  }
}

start();
