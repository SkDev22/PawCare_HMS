import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { Notification } from '@prisma/client';
import { verifyAccessToken } from './jwt';
import { env } from '../config/env';
import { logger } from './logger';

let io: SocketIOServer | undefined;

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data['staffId'] = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const staffId = socket.data['staffId'] as string;
    socket.join(`staff:${staffId}`);
  });

  logger.info('Socket.io server initialized');
  return io;
}

// Fire-and-forget: no-op if a socket recipient isn't currently connected —
// the notification row still exists for the next poll/page load.
export function emitToStaff(staffId: string, notification: Notification): void {
  io?.to(`staff:${staffId}`).emit('notification:new', notification);
}
