import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';
import { initSocket } from './lib/socket';
import { initScheduledJobs, stopScheduledJobs } from './jobs/worker';

async function start() {
  try {
    // Verify DB connection
    await prisma.$connect();
    logger.info('Database connected');

    const httpServer = http.createServer(app);
    initSocket(httpServer);
    initScheduledJobs();

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
        stopScheduledJobs();
        await prisma.$disconnect();
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
