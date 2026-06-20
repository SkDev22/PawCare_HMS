import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { err }));
redis.on('close', () => logger.warn('Redis connection closed'));
