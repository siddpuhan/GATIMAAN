import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { UserRole } from '@gatimaan/shared';
import { createApp } from '../app.js';
import {
  extractRoleFromAuth,
  requireAuth,
  requireRole,
  syncUserRecord,
} from '../middleware/auth.js';
import { prisma } from '../db/client.js';

describe('Auth & RBAC Middleware Unit Tests', () => {
  it('should extract UserRole.ADMIN when publicMetadata role is ADMIN', () => {
    const authWithMetadata = {
      userId: 'user_admin_123',
      sessionClaims: {
        metadata: { role: 'ADMIN' },
      },
    };

    assert.equal(
      extractRoleFromAuth(authWithMetadata as unknown as Request['auth']),
      UserRole.ADMIN
    );
  });

  it('should extract UserRole.OPERATOR when publicMetadata role is OPERATOR', () => {
    const authWithMetadata = {
      userId: 'user_operator_123',
      sessionClaims: {
        metadata: { role: 'OPERATOR' },
      },
    };

    assert.equal(
      extractRoleFromAuth(authWithMetadata as unknown as Request['auth']),
      UserRole.OPERATOR
    );
  });

  it('should fallback safely to UserRole.CUSTOMER when metadata is missing or not ADMIN/OPERATOR', () => {
    const authNoMetadata = {
      userId: 'user_cust_123',
      sessionClaims: {},
    };

    assert.equal(
      extractRoleFromAuth(authNoMetadata as unknown as Request['auth']),
      UserRole.CUSTOMER
    );

    const authInvalidRole = {
      userId: 'user_cust_456',
      sessionClaims: { metadata: { role: 'SUPERUSER' } },
    };

    assert.equal(
      extractRoleFromAuth(authInvalidRole as unknown as Request['auth']),
      UserRole.CUSTOMER
    );
  });

  it('should block unauthenticated requests with 401 Unauthorized', async () => {
    const app = createApp();

    const response = await request(app).get('/api/auth/me');

    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Unauthorized');
  });

  it('should block non-admin users (including OPERATOR) from ADMIN-only routes with 403 Forbidden', async () => {
    // 1. Customer blocked from ADMIN-only route
    const customerApp = express();
    customerApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'user_customer_test',
        sessionClaims: { metadata: { role: 'CUSTOMER' } },
      });
      next();
    });
    customerApp.get('/admin-only', requireAuth, requireRole(UserRole.ADMIN), (_req, res) => {
      res.json({ ok: true });
    });

    const custRes = await request(customerApp).get('/admin-only');
    assert.equal(custRes.status, 403);
    assert.equal(custRes.body.error, 'Forbidden');

    // 2. Operator blocked from ADMIN-only route
    const operatorApp = express();
    operatorApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'user_operator_test',
        sessionClaims: { metadata: { role: 'OPERATOR' } },
      });
      next();
    });
    operatorApp.get('/admin-only', requireAuth, requireRole(UserRole.ADMIN), (_req, res) => {
      res.json({ ok: true });
    });

    const opRes = await request(operatorApp).get('/admin-only');
    assert.equal(opRes.status, 403);
    assert.equal(opRes.body.error, 'Forbidden');
  });

  it('should allow both OPERATOR and ADMIN on staff desk routes, blocking CUSTOMER', async () => {
    const staffGuards = [requireAuth, requireRole([UserRole.ADMIN, UserRole.OPERATOR])];

    // 1. Operator allowed on staff desk route
    const operatorApp = express();
    operatorApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'user_operator_test',
        sessionClaims: { metadata: { role: 'OPERATOR' } },
      });
      next();
    });
    operatorApp.get('/staff-desk', ...staffGuards, (_req, res) => {
      res.json({ success: true, role: 'OPERATOR' });
    });

    const opRes = await request(operatorApp).get('/staff-desk');
    assert.equal(opRes.status, 200);
    assert.equal(opRes.body.success, true);

    // 2. Admin allowed on staff desk route
    const adminApp = express();
    adminApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'user_admin_test',
        sessionClaims: { metadata: { role: 'ADMIN' } },
      });
      next();
    });
    adminApp.get('/staff-desk', ...staffGuards, (_req, res) => {
      res.json({ success: true, role: 'ADMIN' });
    });

    const admRes = await request(adminApp).get('/staff-desk');
    assert.equal(admRes.status, 200);
    assert.equal(admRes.body.success, true);

    // 3. Customer blocked from staff desk route
    const customerApp = express();
    customerApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'user_customer_test',
        sessionClaims: { metadata: { role: 'CUSTOMER' } },
      });
      next();
    });
    customerApp.get('/staff-desk', ...staffGuards, (_req, res) => {
      res.json({ success: true });
    });

    const custRes = await request(customerApp).get('/staff-desk');
    assert.equal(custRes.status, 403);
    assert.equal(custRes.body.error, 'Forbidden');
  });
});

describe('Database User Synchronization Integration Tests', () => {
  const testClerkId = `test_clerk_${Date.now()}`;

  after(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { clerkUserId: testClerkId },
    });
  });

  it('should lazily synchronize a new customer into PostgreSQL', async () => {
    const simulatedAuth = {
      userId: testClerkId,
      sessionClaims: {
        email: `${testClerkId}@test.local`,
        name: 'Test Customer',
        metadata: { role: 'CUSTOMER' },
      },
    };

    const syncedUser = await syncUserRecord(
      simulatedAuth as unknown as NonNullable<Request['auth']>
    );

    assert.ok(syncedUser.id);
    assert.equal(syncedUser.clerkUserId, testClerkId);
    assert.equal(syncedUser.role, UserRole.CUSTOMER);

    // Verify in database directly
    const dbRecord = await prisma.user.findUnique({
      where: { clerkUserId: testClerkId },
    });
    assert.ok(dbRecord);
    assert.equal(dbRecord.email, `${testClerkId}@test.local`);
    assert.equal(dbRecord.role, 'CUSTOMER');
  });

  it('should synchronize role elevation to ADMIN when Clerk metadata updates', async () => {
    const updatedAuth = {
      userId: testClerkId,
      sessionClaims: {
        email: `${testClerkId}@test.local`,
        name: 'Promoted Admin',
        metadata: { role: 'ADMIN' },
      },
    };

    const syncedUser = await syncUserRecord(updatedAuth as unknown as NonNullable<Request['auth']>);

    assert.equal(syncedUser.role, UserRole.ADMIN);

    const dbRecord = await prisma.user.findUnique({
      where: { clerkUserId: testClerkId },
    });
    assert.ok(dbRecord);
    assert.equal(dbRecord.role, 'ADMIN');
  });
});
