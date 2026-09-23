import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import {
  REALTIME_EVENTS,
  REALTIME_TOPICS,
  TicketSubscriptionInput,
  QueueSubscriptionInput,
  SubscriptionAck,
} from '@gatimaan/shared';
import { config } from '../config/env.js';
import { eventBus } from '../events/eventBus.js';

let ioInstance: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  if (ioInstance) {
    return ioInstance;
  }

  const allowedOrigins = config.corsOrigin.includes(',')
    ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : config.corsOrigin;

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  ioInstance = io;

  // Handle client connections and room subscriptions
  io.on('connection', (socket: Socket) => {
    // Ticket Subscription
    socket.on(
      REALTIME_TOPICS.TICKET_SUBSCRIBE,
      (data: TicketSubscriptionInput, callback?: (ack: SubscriptionAck) => void) => {
        if (!data || !data.ticketId || typeof data.ticketId !== 'string') {
          if (callback) {
            callback({ success: false, room: '', message: 'Invalid ticketId provided' });
          }
          return;
        }
        const room = `ticket:${data.ticketId}`;
        socket.join(room);
        if (callback) {
          callback({ success: true, room });
        }
      }
    );

    socket.on(
      REALTIME_TOPICS.TICKET_UNSUBSCRIBE,
      (data: TicketSubscriptionInput, callback?: (ack: SubscriptionAck) => void) => {
        if (data?.ticketId) {
          const room = `ticket:${data.ticketId}`;
          socket.leave(room);
          if (callback) {
            callback({ success: true, room });
          }
        }
      }
    );

    // Queue Subscription
    socket.on(
      REALTIME_TOPICS.QUEUE_SUBSCRIBE,
      (data: QueueSubscriptionInput, callback?: (ack: SubscriptionAck) => void) => {
        if (!data || !data.serviceId || typeof data.serviceId !== 'string') {
          if (callback) {
            callback({ success: false, room: '', message: 'Invalid serviceId provided' });
          }
          return;
        }
        const room = `queue:${data.serviceId}`;
        socket.join(room);
        if (callback) {
          callback({ success: true, room });
        }
      }
    );

    socket.on(
      REALTIME_TOPICS.QUEUE_UNSUBSCRIBE,
      (data: QueueSubscriptionInput, callback?: (ack: SubscriptionAck) => void) => {
        if (data?.serviceId) {
          const room = `queue:${data.serviceId}`;
          socket.leave(room);
          if (callback) {
            callback({ success: true, room });
          }
        }
      }
    );

    // Footfall Subscription
    socket.on(
      REALTIME_TOPICS.FOOTFALL_SUBSCRIBE,
      (_data: unknown, callback?: (ack: SubscriptionAck) => void) => {
        const room = 'footfall';
        socket.join(room);
        if (callback) {
          callback({ success: true, room });
        }
      }
    );

    socket.on(
      REALTIME_TOPICS.FOOTFALL_UNSUBSCRIBE,
      (_data: unknown, callback?: (ack: SubscriptionAck) => void) => {
        const room = 'footfall';
        socket.leave(room);
        if (callback) {
          callback({ success: true, room });
        }
      }
    );

    // Prediction Subscription
    socket.on(
      REALTIME_TOPICS.PREDICTION_SUBSCRIBE,
      (_data: unknown, callback?: (ack: SubscriptionAck) => void) => {
        const room = 'prediction';
        socket.join(room);
        if (callback) {
          callback({ success: true, room });
        }
      }
    );

    socket.on(
      REALTIME_TOPICS.PREDICTION_UNSUBSCRIBE,
      (_data: unknown, callback?: (ack: SubscriptionAck) => void) => {
        const room = 'prediction';
        socket.leave(room);
        if (callback) {
          callback({ success: true, room });
        }
      }
    );
  });

  // Wire up EventBus listeners to broadcast to respective rooms
  eventBus.on(REALTIME_EVENTS.TICKET_UPDATED, (payload) => {
    io.to(`ticket:${payload.ticket.id}`).emit(REALTIME_EVENTS.TICKET_UPDATED, payload);
  });

  eventBus.on(REALTIME_EVENTS.QUEUE_UPDATED, (payload) => {
    io.to(`queue:${payload.serviceId}`).emit(REALTIME_EVENTS.QUEUE_UPDATED, payload);
  });

  eventBus.on(REALTIME_EVENTS.FOOTFALL_UPDATED, (payload) => {
    io.to('footfall').emit(REALTIME_EVENTS.FOOTFALL_UPDATED, payload);
  });

  eventBus.on(REALTIME_EVENTS.PREDICTION_UPDATED, (payload) => {
    io.to('prediction').emit(REALTIME_EVENTS.PREDICTION_UPDATED, payload);
  });

  return io;
}

export function getSocketServer(): Server | null {
  return ioInstance;
}

export async function closeSocketServer(): Promise<void> {
  if (ioInstance) {
    await new Promise<void>((resolve) => {
      ioInstance!.close(() => {
        resolve();
      });
    });
    ioInstance = null;
  }
}
