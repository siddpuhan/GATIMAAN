import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { createApp } from '../app.js';
import { servicesRouter } from '../routes/services.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { prisma } from '../db/client.js';

function createAdminApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next) => {
    req.auth = () => ({
      userId: 'test_admin_services',
      sessionClaims: {
        email: 'admin_services@test.local',
        metadata: { role: 'ADMIN' },
      },
    });
    next();
  });
  app.use('/', servicesRouter);
  app.use(errorHandler);
  return app;
}

function createCustomerApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next) => {
    req.auth = () => ({
      userId: 'test_cust_services',
      sessionClaims: {
        email: 'cust_services@test.local',
        metadata: { role: 'CUSTOMER' },
      },
    });
    next();
  });
  app.use('/', servicesRouter);
  app.use(errorHandler);
  return app;
}

describe('Services API Integration Tests', () => {
  const testServiceCode = `TEST_${Date.now().toString().slice(-4)}`;
  let createdServiceId: string;

  after(async () => {
    // Cleanup any test services created
    await prisma.service.deleteMany({
      where: { code: { startsWith: 'TEST_' } },
    });
    // Cleanup test user
    await prisma.user.deleteMany({
      where: { clerkUserId: { in: ['test_admin_services', 'test_cust_services'] } },
    });
  });

  it('should allow unauthenticated public request to GET /api/services and return active services', async () => {
    const app = createApp();
    const res = await request(app).get('/api/services');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    // Verify all returned services are active
    for (const s of res.body) {
      assert.equal(s.isActive, true);
    }
  });

  it('should allow CUSTOMER role to GET /api/services and return active services', async () => {
    const customerApp = createCustomerApp();
    const res = await request(customerApp).get('/api/services');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    for (const s of res.body) {
      assert.equal(s.isActive, true);
    }
  });

  it('should reject CUSTOMER role request to POST /api/services with 403', async () => {
    const customerApp = createCustomerApp();
    const res = await request(customerApp).post('/api/services').send({
      code: 'CUSTX',
      name: 'Customer Created Service',
      prefix: 'C',
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'Forbidden');
  });

  it('should allow ADMIN to list services', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).get('/api/services');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('should allow ADMIN to create a new service', async () => {
    const adminApp = createAdminApp();
    const payload = {
      code: testServiceCode,
      name: 'Test Driving License',
      description: 'Test issuance of DL',
      prefix: 'T',
      avgDurationMinutes: 20,
      priority: 1,
      isActive: true,
    };

    const res = await request(adminApp).post('/api/services').send(payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.code, testServiceCode);
    assert.equal(res.body.name, 'Test Driving License');
    assert.equal(res.body.prefix, 'T');
    assert.equal(res.body.avgDurationMinutes, 20);
    assert.equal(res.body.isActive, true);
    assert.ok(res.body.id);

    createdServiceId = res.body.id;
  });

  it('should return 400 for invalid service payload (missing name and prefix)', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).post('/api/services').send({
      code: 'INV',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'BadRequestError');
  });

  it('should return 409 when creating service with duplicate code', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).post('/api/services').send({
      code: testServiceCode,
      name: 'Duplicate Service',
      prefix: 'D',
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ConflictError');
  });

  it('should allow ADMIN to get a single service by ID', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).get(`/api/services/${createdServiceId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, createdServiceId);
    assert.equal(res.body.code, testServiceCode);
  });

  it('should allow ADMIN to update service details', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp)
      .patch(`/api/services/${createdServiceId}`)
      .send({
        name: 'Updated Driving License Service',
        avgDurationMinutes: 30,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Updated Driving License Service');
    assert.equal(res.body.avgDurationMinutes, 30);
  });

  it('should allow ADMIN to update service active status', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp)
      .patch(`/api/services/${createdServiceId}/status`)
      .send({ isActive: false });

    assert.equal(res.status, 200);
    assert.equal(res.body.isActive, false);

    // Verify database state
    const dbRecord = await prisma.service.findUnique({
      where: { id: createdServiceId },
    });
    assert.equal(dbRecord?.isActive, false);
  });

  it('should return 404 when querying nonexistent service ID', async () => {
    const adminApp = createAdminApp();
    const res = await request(adminApp).get('/api/services/00000000-0000-0000-0000-000000000000');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'NotFoundError');
  });
});
