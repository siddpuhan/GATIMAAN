import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { createApp } from '../app.js';
import { countersRouter } from '../routes/counters.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { prisma, disconnectDb } from '../db/client.js';

function createAdminApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next) => {
    req.auth = () => ({
      userId: 'test_admin_counters',
      sessionClaims: {
        email: 'admin_counters@test.local',
        name: 'Admin Counters Operator',
        metadata: { role: 'ADMIN' },
      },
    });
    next();
  });
  app.use('/', countersRouter);
  app.use(errorHandler);
  return app;
}

function createCustomerApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next) => {
    req.auth = () => ({
      userId: 'test_cust_counters',
      sessionClaims: {
        email: 'cust_counters@test.local',
        metadata: { role: 'CUSTOMER' },
      },
    });
    next();
  });
  app.use('/', countersRouter);
  app.use(errorHandler);
  return app;
}

describe('Counters and Counter Sessions API Integration Tests', () => {
  const testCounterNumber = 9000 + Math.floor(Math.random() * 900);
  let createdCounterId: string;

  after(async () => {
    if (createdCounterId) {
      // Clean up counter sessions for test counter
      await prisma.counterSession.deleteMany({
        where: { counterId: createdCounterId },
      });

      // Clean up test counter
      await prisma.counter.deleteMany({
        where: { id: createdCounterId },
      });
    }

    // Clean up test users
    await prisma.user.deleteMany({
      where: { clerkUserId: { in: ['test_admin_counters', 'test_cust_counters'] } },
    });

    await disconnectDb();
  });

  it('should reject unauthenticated request to GET /api/counters with 401', async () => {
    const app = createApp();
    const res = await request(app).get('/api/counters');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  it('should reject CUSTOMER role request to GET /api/counters with 403', async () => {
    const customerApp = createCustomerApp();
    const res = await request(customerApp).get('/api/counters');
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'Forbidden');
  });

  it('should allow ADMIN to list counters', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).get('/api/counters');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('should allow ADMIN to create a new counter', async () => {
    const adminApp = createAdminApp();
    const payload = {
      counterNumber: testCounterNumber,
      name: `Special Test Counter ${testCounterNumber}`,
      isActive: true,
    };

    const res = await request(adminApp).post('/api/counters').send(payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.counterNumber, testCounterNumber);
    assert.equal(res.body.name, `Special Test Counter ${testCounterNumber}`);
    assert.equal(res.body.isActive, true);
    assert.ok(res.body.id);

    createdCounterId = res.body.id;
  });

  it('should return 400 for invalid counter payload (invalid number format)', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).post('/api/counters').send({
      counterNumber: -5,
      name: 'Invalid Counter',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'BadRequestError');
  });

  it('should return 409 when creating counter with duplicate counter number', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).post('/api/counters').send({
      counterNumber: testCounterNumber,
      name: 'Duplicate Number Counter',
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ConflictError');
  });

  it('should allow ADMIN to get a single counter by ID', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).get(`/api/counters/${createdCounterId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, createdCounterId);
    assert.equal(res.body.counterNumber, testCounterNumber);
    assert.equal(res.body.currentSession, null);
  });

  it('should allow ADMIN to update counter details', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp)
      .patch(`/api/counters/${createdCounterId}`)
      .send({ name: 'Updated Special Counter' });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Updated Special Counter');
  });

  describe('Counter Sessions Lifecycle', () => {
    it('should open a new counter session and create a database session record', async () => {
      const adminApp = createAdminApp();
      const res = await request(adminApp).post(`/api/counters/${createdCounterId}/open`);

      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Counter opened successfully');
      assert.ok(res.body.session);
      assert.equal(res.body.session.counterId, createdCounterId);
      assert.equal(res.body.session.isActive, true);
      assert.equal(res.body.session.endedAt, null);
      assert.ok(res.body.session.openedAt);

      // Verify in DB directly
      const sessionInDb = await prisma.counterSession.findUnique({
        where: { id: res.body.session.id },
      });
      assert.ok(sessionInDb);
      assert.equal(sessionInDb.counterId, createdCounterId);
      assert.equal(sessionInDb.isActive, true);
      assert.equal(sessionInDb.endedAt, null);
    });

    it('should prevent opening a counter session twice with 409 Conflict', async () => {
      const adminApp = createAdminApp();
      const res = await request(adminApp).post(`/api/counters/${createdCounterId}/open`);

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'ConflictError');
    });

    it('should show the active session in GET /api/counters', async () => {
      const adminApp = createAdminApp();
      const res = await request(adminApp).get(`/api/counters/${createdCounterId}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.currentSession);
      assert.equal(res.body.currentSession.counterId, createdCounterId);
      assert.equal(res.body.currentSession.isActive, true);
    });

    it('should close the active counter session and record endedAt timestamp', async () => {
      const adminApp = createAdminApp();
      const res = await request(adminApp).post(`/api/counters/${createdCounterId}/close`);

      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Counter closed successfully');
      assert.ok(res.body.session);
      assert.equal(res.body.session.counterId, createdCounterId);
      assert.equal(res.body.session.isActive, false);
      assert.ok(res.body.session.endedAt);

      // Verify in DB
      const sessionInDb = await prisma.counterSession.findUnique({
        where: { id: res.body.session.id },
      });
      assert.ok(sessionInDb);
      assert.equal(sessionInDb.isActive, false);
      assert.ok(sessionInDb.endedAt !== null);
    });

    it('should return 409 when closing a counter that has no active session', async () => {
      const adminApp = createAdminApp();
      const res = await request(adminApp).post(`/api/counters/${createdCounterId}/close`);

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'ConflictError');
    });

    it('should reject opening session for an inactive counter with 400 Bad Request', async () => {
      const adminApp = createAdminApp();

      // Deactivate counter
      await request(adminApp)
        .patch(`/api/counters/${createdCounterId}/status`)
        .send({ isActive: false });

      // Attempt open
      const res = await request(adminApp).post(`/api/counters/${createdCounterId}/open`);
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'BadRequestError');
    });
  });
});
