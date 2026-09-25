import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma, disconnectDb } from '../db/client.js';
import { hashDeviceKey } from '../middleware/deviceAuth.js';

describe('IoT Device Authentication Integration Tests', () => {
  const app = createApp();
  const testDeviceId = `TEST-DEV-AUTH-${Date.now()}`;
  const testDeviceKey = 'test-secret-key-xyz-123';
  const deactDeviceId = `TEST-DEV-DEACT-${Date.now()}`;
  const deactDeviceKey = 'test-secret-deactivated-key';

  let activeDeviceDbId: string;
  let deactDeviceDbId: string;

  before(async () => {
    // Create active test device
    const activeDev = await prisma.device.create({
      data: {
        deviceId: testDeviceId,
        keyHash: hashDeviceKey(testDeviceKey),
        name: 'Test Gate Auth Device',
        deviceType: 'GATE',
        location: 'Test Gate A',
        isActive: true,
      },
    });
    activeDeviceDbId = activeDev.id;

    // Create deactivated test device
    const deactDev = await prisma.device.create({
      data: {
        deviceId: deactDeviceId,
        keyHash: hashDeviceKey(deactDeviceKey),
        name: 'Deactivated Gate Device',
        deviceType: 'GATE',
        location: 'Test Gate B',
        isActive: false,
      },
    });
    deactDeviceDbId = deactDev.id;
  });

  after(async () => {
    // Cleanup created events and devices
    await prisma.footfallEvent.deleteMany({
      where: {
        deviceId: { in: [activeDeviceDbId, deactDeviceDbId] },
      },
    });
    await prisma.device.deleteMany({
      where: {
        id: { in: [activeDeviceDbId, deactDeviceDbId] },
      },
    });
    await disconnectDb();
  });

  it('should reject request when device headers are completely missing with 401', async () => {
    const res = await request(app)
      .post('/api/iot/footfall')
      .send({
        clientEventId: `evt-${Date.now()}`,
        eventType: 'IN',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  it('should reject request when x-device-key is missing with 401', async () => {
    const res = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', testDeviceId)
      .send({
        clientEventId: `evt-${Date.now()}`,
        eventType: 'IN',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  it('should reject request with unknown deviceId with 401', async () => {
    const res = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', 'UNKNOWN-DEVICE-999')
      .set('x-device-key', testDeviceKey)
      .send({
        clientEventId: `evt-${Date.now()}`,
        eventType: 'IN',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  it('should reject request with wrong secret key with 401', async () => {
    const res = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', 'wrong-passkey-abc')
      .send({
        clientEventId: `evt-${Date.now()}`,
        eventType: 'IN',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  it('should reject request from a deactivated device with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', deactDeviceId)
      .set('x-device-key', deactDeviceKey)
      .send({
        clientEventId: `evt-${Date.now()}`,
        eventType: 'IN',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'Forbidden');
  });

  it('should accept request with valid device credentials and update lastSeenAt', async () => {
    const clientEventId = `auth-test-${Date.now()}`;
    const beforeTime = new Date();

    const res = await request(app)
      .post('/api/iot/footfall')
      .set('x-device-id', testDeviceId)
      .set('x-device-key', testDeviceKey)
      .send({
        clientEventId,
        eventType: 'IN',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.clientEventId, clientEventId);

    // Verify lastSeenAt was updated in the DB
    const devRecord = await prisma.device.findUnique({
      where: { id: activeDeviceDbId },
    });
    assert.ok(devRecord?.lastSeenAt);
    assert.ok(new Date(devRecord.lastSeenAt).getTime() >= beforeTime.getTime() - 1000);
  });
});
