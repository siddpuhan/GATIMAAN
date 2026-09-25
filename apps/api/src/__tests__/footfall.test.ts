import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { DeviceType, FootfallEventType, REALTIME_EVENTS, UserRole } from '@gatimaan/shared';
import { createApp } from '../app.js';
import { prisma, disconnectDb } from '../db/client.js';
import { hashDeviceKey } from '../middleware/deviceAuth.js';
import { eventBus } from '../events/eventBus.js';
import { requireAuth, requireRole, syncUserMiddleware } from '../middleware/auth.js';
import { footfallService } from '../services/footfallService.js';

describe('Footfall Ingestion & Telemetry Integration Tests', () => {
  const app = createApp();
  const testDeviceId = `GATE-TEST-${Date.now()}`;
  const testDeviceKey = 'test-gate-secret-key-456';
  let deviceDbId: string;

  // Track realtime events
  const capturedEvents: unknown[] = [];
  const realtimeListener = (payload: unknown) => {
    capturedEvents.push(payload);
  };

  before(async () => {
    eventBus.on(REALTIME_EVENTS.FOOTFALL_UPDATED, realtimeListener);

    // Create test gate device
    const dev = await prisma.device.create({
      data: {
        deviceId: testDeviceId,
        keyHash: hashDeviceKey(testDeviceKey),
        name: 'Test Entry Gate',
        deviceType: 'GATE',
        location: 'North Entry',
        isActive: true,
      },
    });
    deviceDbId = dev.id;
  });

  after(async () => {
    eventBus.off(REALTIME_EVENTS.FOOTFALL_UPDATED, realtimeListener);

    // Clean up test events, snapshots, and devices
    await prisma.footfallEvent.deleteMany({
      where: { deviceId: deviceDbId },
    });
    await prisma.footfallSnapshot.deleteMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    await prisma.device.deleteMany({
      where: { id: deviceDbId },
    });
    await disconnectDb();
  });

  it('should ingest an IN footfall event and emit REALTIME_EVENTS.FOOTFALL_UPDATED', async () => {
    capturedEvents.length = 0;
    const clientEventId = `evt-in-${Date.now()}`;

    const res = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        clientEventId,
        eventType: FootfallEventType.IN,
        metadata: { source: 'ir_sensor_a' },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.clientEventId, clientEventId);
    assert.equal(res.body.isDuplicate, false);
    assert.ok(res.body.currentOccupancy >= 1);

    // Verify Socket.IO event emission over event bus
    assert.ok(capturedEvents.length > 0);
    const lastEvent = capturedEvents[capturedEvents.length - 1] as {
      eventType: string;
      gateId: string;
      currentOccupancy: number;
    };
    assert.equal(lastEvent.eventType, FootfallEventType.IN);
    assert.equal(lastEvent.gateId, testDeviceId);
    assert.equal(lastEvent.currentOccupancy, res.body.currentOccupancy);
  });

  it('should handle duplicate clientEventId idempotently without extra broadcast', async () => {
    const clientEventId = `evt-dup-${Date.now()}`;

    // First ingestion
    const firstRes = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        clientEventId,
        eventType: FootfallEventType.IN,
      });
    assert.equal(firstRes.status, 201);
    assert.equal(firstRes.body.isDuplicate, false);

    capturedEvents.length = 0;

    // Duplicate ingestion with same clientEventId
    const dupRes = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        clientEventId,
        eventType: FootfallEventType.IN,
      });

    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.success, true);
    assert.equal(dupRes.body.isDuplicate, true);
    assert.equal(dupRes.body.clientEventId, clientEventId);

    // Ensure no duplicate realtime event was broadcast
    assert.equal(capturedEvents.length, 0);
  });

  it('should ingest an OUT footfall event and decrement occupancy without going negative', async () => {
    const clientEventId = `evt-out-${Date.now()}`;

    const res = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        clientEventId,
        eventType: FootfallEventType.OUT,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.eventType, FootfallEventType.OUT);
    assert.ok(res.body.currentOccupancy >= 0);
  });

  it('should process batch footfall events with offline replay deduplication', async () => {
    const batchId = Date.now();
    const event1 = `batch-${batchId}-1`;
    const event2 = `batch-${batchId}-2`;
    const event3 = `batch-${batchId}-3`;

    // Pre-insert event1 to simulate partial prior sync
    await footfallService.ingestEvent(
      {
        id: deviceDbId,
        deviceId: testDeviceId,
        deviceType: DeviceType.GATE,
        name: 'Test Gate',
        location: 'North Entry',
        isActive: true,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        clientEventId: event1,
        eventType: FootfallEventType.IN,
      }
    );

    const res = await request(app)
      .post('/api/iot/footfall/batch')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        events: [
          { clientEventId: event1, eventType: FootfallEventType.IN },
          { clientEventId: event2, eventType: FootfallEventType.IN },
          { clientEventId: event3, eventType: FootfallEventType.OUT },
        ],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.totalReceived, 3);
    assert.equal(res.body.inserted, 2);
    assert.equal(res.body.duplicates, 1);
  });

  it('should generate hourly snapshot and retrieve summary telemetry', async () => {
    // Test service layer directly for snapshot generation
    const snapshot = await footfallService.generateSnapshot();
    assert.ok(snapshot.id);
    assert.ok(typeof snapshot.countIn === 'number');
    assert.ok(typeof snapshot.countOut === 'number');
    assert.ok(snapshot.netOccupancy >= 0);

    // Test summary calculation
    const summary = await footfallService.getFootfallSummary();
    assert.ok(typeof summary.currentOccupancy === 'number');
    assert.ok(summary.todayCountIn >= 1);
    assert.ok(summary.peakOccupancyToday >= 0);
  });

  it('should protect GET /api/footfall/current with admin authorization', async () => {
    // Unauthenticated request should fail
    const unauthRes = await request(app).get('/api/footfall/current');
    assert.equal(unauthRes.status, 401);

    // Admin authenticated request
    const adminApp = express();
    adminApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'admin_test_123',
        sessionClaims: { metadata: { role: 'ADMIN' } },
      });
      next();
    });
    adminApp.get(
      '/api/footfall/current',
      requireAuth,
      requireRole(UserRole.ADMIN),
      syncUserMiddleware,
      async (_req, res, next) => {
        try {
          const summary = await footfallService.getFootfallSummary();
          res.status(200).json(summary);
        } catch (err) {
          next(err);
        }
      }
    );

    const authRes = await request(adminApp).get('/api/footfall/current');
    assert.equal(authRes.status, 200);
    assert.ok(typeof authRes.body.currentOccupancy === 'number');
    assert.ok(typeof authRes.body.todayCountIn === 'number');
  });
});
