import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import {
  REALTIME_EVENTS,
  REALTIME_TOPICS,
  TicketUpdatedPayload,
  QueueUpdatedPayload,
  FootfallUpdatedPayload,
  PredictionUpdatedPayload,
  ServiceUpdatedPayload,
  SubscriptionAck,
  DemandLevel,
  FootfallEventType,
} from '@gatimaan/shared';
import { ticketsRouter } from '../routes/tickets.js';
import { servicesRouter } from '../routes/services.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { initSocketServer, closeSocketServer } from '../realtime/socketServer.js';
import { eventBus } from '../events/eventBus.js';
import { prisma } from '../db/client.js';

describe('Realtime & Socket.IO Integration Tests', () => {
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  const serviceCode = `RTSV${randomSuffix}`;
  const counterNumber = 80000 + (randomSuffix % 4000);
  const adminClerkId = `test_admin_rt_${randomSuffix}`;
  const adminEmail = `admin_rt_${randomSuffix}@test.local`;
  const custClerkId = `test_cust_rt_${randomSuffix}`;
  const custEmail = `cust_rt_${randomSuffix}@test.local`;

  let serviceId: string;
  let counterId: string;
  let adminUserId: string;

  let server: http.Server;
  let serverPort: number;
  let serverUrl: string;

  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next) => {
      const authHeader = req.headers['x-test-role'];
      if (authHeader === 'ADMIN') {
        req.auth = () => ({
          userId: adminClerkId,
          sessionClaims: {
            email: adminEmail,
            name: `Admin RT ${randomSuffix}`,
            metadata: { role: 'ADMIN' },
          },
        });
      } else {
        req.auth = () => ({
          userId: custClerkId,
          sessionClaims: {
            email: custEmail,
            metadata: { role: 'CUSTOMER' },
          },
        });
      }
      next();
    });
    app.use('/', ticketsRouter);
    app.use('/', servicesRouter);
    app.use(errorHandler);
    return app;
  }

  before(async () => {
    // 1. Seed Service
    const service = await prisma.service.create({
      data: {
        code: serviceCode,
        name: `Realtime Service ${randomSuffix}`,
        prefix: `R${randomSuffix.toString().slice(-2)}`,
        avgDurationMinutes: 10,
        priority: 1,
        isActive: true,
      },
    });
    serviceId = service.id;

    // 2. Seed Admin User & Counter with active CounterSession
    const adminUser = await prisma.user.create({
      data: {
        clerkUserId: adminClerkId,
        email: adminEmail,
        name: `Admin RT ${randomSuffix}`,
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;

    const counter = await prisma.counter.create({
      data: {
        counterNumber,
        name: `Counter RT ${counterNumber}`,
        isActive: true,
      },
    });
    counterId = counter.id;

    await prisma.counterSession.create({
      data: {
        counterId,
        userId: adminUserId,
        isActive: true,
        openedAt: new Date(),
      },
    });

    // 3. Start unified HTTP + Socket.IO server on ephemeral port
    const app = createTestApp();
    server = http.createServer(app);
    initSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port;
          serverUrl = `http://127.0.0.1:${serverPort}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up server
    await closeSocketServer();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    // Clean up DB
    await prisma.ticket.deleteMany({ where: { serviceId } });
    await prisma.counterSession.deleteMany({ where: { counterId } });
    await prisma.counter.deleteMany({ where: { id: counterId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.user.deleteMany({ where: { clerkUserId: adminClerkId } });
    await prisma.user.deleteMany({ where: { clerkUserId: custClerkId } });
  });

  function createClientSocket(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = Client(serverUrl, {
        transports: ['websocket'],
        reconnection: false,
      });

      socket.on('connect', () => {
        resolve(socket);
      });

      socket.on('connect_error', (err) => {
        reject(err);
      });
    });
  }

  it('connects to Socket.IO and responds to room subscriptions with ACKs', async () => {
    const client = await createClientSocket();

    try {
      // 1. Subscribe to ticket
      const ticketAck = await new Promise<SubscriptionAck>((resolve) => {
        client.emit(
          REALTIME_TOPICS.TICKET_SUBSCRIBE,
          { ticketId: 'test-ticket-id' },
          (ack: SubscriptionAck) => resolve(ack)
        );
      });
      assert.strictEqual(ticketAck.success, true);
      assert.strictEqual(ticketAck.room, 'ticket:test-ticket-id');

      // 2. Subscribe to queue
      const queueAck = await new Promise<SubscriptionAck>((resolve) => {
        client.emit(
          REALTIME_TOPICS.QUEUE_SUBSCRIBE,
          { serviceId: 'test-service-id' },
          (ack: SubscriptionAck) => resolve(ack)
        );
      });
      assert.strictEqual(queueAck.success, true);
      assert.strictEqual(queueAck.room, 'queue:test-service-id');

      // 3. Subscribe to footfall
      const footfallAck = await new Promise<SubscriptionAck>((resolve) => {
        client.emit(REALTIME_TOPICS.FOOTFALL_SUBSCRIBE, {}, (ack: SubscriptionAck) => resolve(ack));
      });
      assert.strictEqual(footfallAck.success, true);
      assert.strictEqual(footfallAck.room, 'footfall');

      // 4. Subscribe to prediction
      const predictionAck = await new Promise<SubscriptionAck>((resolve) => {
        client.emit(REALTIME_TOPICS.PREDICTION_SUBSCRIBE, {}, (ack: SubscriptionAck) => resolve(ack));
      });
      assert.strictEqual(predictionAck.success, true);
      assert.strictEqual(predictionAck.room, 'prediction');
    } finally {
      client.disconnect();
    }
  });

  it('receives ticket.updated and queue.updated events in real-time when ticket is issued and called', async () => {
    const ticketClient = await createClientSocket();
    const queueClient = await createClientSocket();

    try {
      // Subscribe queue client to service room
      await new Promise<SubscriptionAck>((resolve) => {
        queueClient.emit(
          REALTIME_TOPICS.QUEUE_SUBSCRIBE,
          { serviceId },
          (ack: SubscriptionAck) => resolve(ack)
        );
      });

      // Prepare queue promise
      const queueUpdatePromise = new Promise<QueueUpdatedPayload>((resolve) => {
        queueClient.once(REALTIME_EVENTS.QUEUE_UPDATED, (payload: QueueUpdatedPayload) => {
          resolve(payload);
        });
      });

      // Issue ticket via REST API
      const res = await request(server)
        .post('/api/tickets/issue')
        .send({ serviceId, priority: 1 })
        .expect(201);

      const issuedTicketId = res.body.id;
      const ticketNumber = res.body.ticketNumber;

      // Now subscribe ticketClient to this specific ticket room
      await new Promise<SubscriptionAck>((resolve) => {
        ticketClient.emit(
          REALTIME_TOPICS.TICKET_SUBSCRIBE,
          { ticketId: issuedTicketId },
          (ack: SubscriptionAck) => resolve(ack)
        );
      });

      // Prepare ticket promise for CALL action
      const ticketCallPromise = new Promise<TicketUpdatedPayload>((resolve) => {
        ticketClient.once(REALTIME_EVENTS.TICKET_UPDATED, (payload: TicketUpdatedPayload) => {
          resolve(payload);
        });
      });

      // Call ticket as admin
      const callRes = await request(server)
        .post('/api/tickets/call-next')
        .set('x-test-role', 'ADMIN')
        .send({ counterId, serviceId })
        .expect(200);

      assert.ok(callRes.body.ticket);
      assert.strictEqual(callRes.body.ticket.id, issuedTicketId);

      // Verify ticket update event received by ticketClient
      const receivedTicketPayload = await ticketCallPromise;
      assert.strictEqual(receivedTicketPayload.ticket.id, issuedTicketId);
      assert.strictEqual(receivedTicketPayload.ticket.ticketNumber, ticketNumber);
      assert.strictEqual(receivedTicketPayload.action, 'CALLED');
      assert.strictEqual(receivedTicketPayload.ticket.status, 'CALLED');

      // Verify queue update event received by queueClient
      const receivedQueuePayload = await queueUpdatePromise;
      assert.strictEqual(receivedQueuePayload.serviceId, serviceId);
      assert.strictEqual(typeof receivedQueuePayload.waitingCount, 'number');

      // Clean up ticket state for subsequent tests by completing it
      await request(server)
        .post(`/api/tickets/${issuedTicketId}/serve`)
        .set('x-test-role', 'ADMIN')
        .send({ counterId })
        .expect(200);

      await request(server)
        .post(`/api/tickets/${issuedTicketId}/complete`)
        .set('x-test-role', 'ADMIN')
        .send({ counterId })
        .expect(200);
    } finally {
      ticketClient.disconnect();
      queueClient.disconnect();
    }
  });

  it('receives ticket.updated across full lifecycle: SERVING -> COMPLETED', async () => {
    // 1. Issue a new ticket
    const res = await request(server)
      .post('/api/tickets/issue')
      .send({ serviceId, priority: 2 })
      .expect(201);

    const ticketId = res.body.id;

    // Call the ticket first to put it in CALLED state
    await request(server)
      .post('/api/tickets/call-next')
      .set('x-test-role', 'ADMIN')
      .send({ counterId, serviceId })
      .expect(200);

    const ticketClient = await createClientSocket();

    try {
      await new Promise<SubscriptionAck>((resolve) => {
        ticketClient.emit(
          REALTIME_TOPICS.TICKET_SUBSCRIBE,
          { ticketId },
          (ack: SubscriptionAck) => resolve(ack)
        );
      });

      // 2. Test SERVING transition
      const servePromise = new Promise<TicketUpdatedPayload>((resolve) => {
        ticketClient.once(REALTIME_EVENTS.TICKET_UPDATED, (payload: TicketUpdatedPayload) => {
          resolve(payload);
        });
      });

      await request(server)
        .post(`/api/tickets/${ticketId}/serve`)
        .set('x-test-role', 'ADMIN')
        .send({ counterId })
        .expect(200);

      const servePayload = await servePromise;
      assert.strictEqual(servePayload.action, 'SERVING');
      assert.strictEqual(servePayload.ticket.status, 'SERVING');

      // 3. Test COMPLETED transition
      const completePromise = new Promise<TicketUpdatedPayload>((resolve) => {
        ticketClient.once(REALTIME_EVENTS.TICKET_UPDATED, (payload: TicketUpdatedPayload) => {
          resolve(payload);
        });
      });

      await request(server)
        .post(`/api/tickets/${ticketId}/complete`)
        .set('x-test-role', 'ADMIN')
        .send({ counterId })
        .expect(200);

      const completePayload = await completePromise;
      assert.strictEqual(completePayload.action, 'COMPLETED');
      assert.strictEqual(completePayload.ticket.status, 'COMPLETED');
    } finally {
      ticketClient.disconnect();
    }
  });

  it('broadcasts footfall and prediction events over eventBus to subscribed rooms', async () => {
    const footfallClient = await createClientSocket();
    const predictionClient = await createClientSocket();

    try {
      await new Promise<SubscriptionAck>((resolve) => {
        footfallClient.emit(REALTIME_TOPICS.FOOTFALL_SUBSCRIBE, {}, (ack: SubscriptionAck) => resolve(ack));
      });

      await new Promise<SubscriptionAck>((resolve) => {
        predictionClient.emit(REALTIME_TOPICS.PREDICTION_SUBSCRIBE, {}, (ack: SubscriptionAck) => resolve(ack));
      });

      const footfallPromise = new Promise<FootfallUpdatedPayload>((resolve) => {
        footfallClient.once(REALTIME_EVENTS.FOOTFALL_UPDATED, (p: FootfallUpdatedPayload) => resolve(p));
      });

      const predictionPromise = new Promise<PredictionUpdatedPayload>((resolve) => {
        predictionClient.once(REALTIME_EVENTS.PREDICTION_UPDATED, (p: PredictionUpdatedPayload) => resolve(p));
      });

      // Emit domain events on the eventBus
      eventBus.emit(REALTIME_EVENTS.FOOTFALL_UPDATED, {
        eventType: FootfallEventType.IN,
        gateId: 'gate-north-01',
        currentOccupancy: 42,
        timestamp: new Date().toISOString(),
      });

      eventBus.emit(REALTIME_EVENTS.PREDICTION_UPDATED, {
        serviceId,
        predictedWaitSeconds: 300,
        demandLevel: DemandLevel.MEDIUM,
        timestamp: new Date().toISOString(),
      });

      const receivedFootfall = await footfallPromise;
      assert.strictEqual(receivedFootfall.gateId, 'gate-north-01');
      assert.strictEqual(receivedFootfall.currentOccupancy, 42);

      const receivedPrediction = await predictionPromise;
      assert.strictEqual(receivedPrediction.serviceId, serviceId);
      assert.strictEqual(receivedPrediction.predictedWaitSeconds, 300);
      assert.strictEqual(receivedPrediction.demandLevel, DemandLevel.MEDIUM);
    } finally {
      footfallClient.disconnect();
      predictionClient.disconnect();
    }
  });

  it('does not emit events when a transaction fails / is rejected', async () => {
    const ticketClient = await createClientSocket();

    try {
      let eventReceived = false;
      ticketClient.on(REALTIME_EVENTS.TICKET_UPDATED, () => {
        eventReceived = true;
      });

      // Attempt to cancel a non-existent ticket
      await request(server)
        .post('/api/tickets/00000000-0000-0000-0000-000000000000/cancel')
        .expect(404);

      // Wait a short duration to ensure no stray event was emitted
      await new Promise((r) => setTimeout(r, 200));
      assert.strictEqual(eventReceived, false);
    } finally {
      ticketClient.disconnect();
    }
  });

  it('broadcasts service.updated event to subscribers in services room when service status changes', async () => {
    const servicesClient = await createClientSocket();

    try {
      // 1. Subscribe to services catalog
      const subAckPromise = new Promise<SubscriptionAck>((resolve) => {
        servicesClient.emit(REALTIME_TOPICS.SERVICES_SUBSCRIBE, {}, (ack: SubscriptionAck) => {
          resolve(ack);
        });
      });
      const ack = await subAckPromise;
      assert.strictEqual(ack.success, true);
      assert.strictEqual(ack.room, 'services');

      // 2. Set up listener for service.updated
      const serviceUpdatedPromise = new Promise<ServiceUpdatedPayload>((resolve) => {
        servicesClient.on(REALTIME_EVENTS.SERVICE_UPDATED, (payload: ServiceUpdatedPayload) => {
          resolve(payload);
        });
      });

      // 3. Admin deactivates the service via API
      const res = await request(server)
        .patch(`/api/services/${serviceId}/status`)
        .set('x-test-role', 'ADMIN')
        .send({ isActive: false })
        .expect(200);

      assert.strictEqual(res.body.isActive, false);

      // 4. Verify the client received the service.updated broadcast immediately
      const received = await serviceUpdatedPromise;
      assert.strictEqual(received.service.id, serviceId);
      assert.strictEqual(received.service.isActive, false);
      assert.strictEqual(received.action, 'STATUS_CHANGED');

      // 5. Restore service to active for clean state
      await request(server)
        .patch(`/api/services/${serviceId}/status`)
        .set('x-test-role', 'ADMIN')
        .send({ isActive: true })
        .expect(200);
    } finally {
      servicesClient.disconnect();
    }
  });
});

