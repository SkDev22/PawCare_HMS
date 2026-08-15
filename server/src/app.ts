import path from 'path';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiRouter } from './api/routes/index';
import { errorHandler } from './middleware/error-handler';
import { logger } from './lib/logger';

export const app: Express = express();

// Security headers
app.use(helmet());

// CORS — credentials required for refresh token cookie
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, _res, next) => {
  logger.info('Incoming request', { method: req.method, path: req.path });
  next();
});

// API routes
app.use('/api/v1', apiRouter);

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built web frontend from the same origin/process in production
// (pilot deployment has no separate static host). tsconfig's rootDir mirrors
// the monorepo layout into dist, so __dirname here is
// <repo>/server/dist/server/src — four levels up reaches the repo root.
if (env.NODE_ENV === 'production') {
  const webDist = path.join(__dirname, '../../../../apps/web/dist');
  app.use(express.static(webDist));
  app.get(/^(?!\/api|\/socket\.io|\/health).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// Global error handler — must be last
app.use(errorHandler);
