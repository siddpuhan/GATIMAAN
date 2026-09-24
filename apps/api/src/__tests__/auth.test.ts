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
import { prisma, disconnectDb } from '../db/client.js';

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

  it('should fallback safely to UserRole.CUSTOMER when metadata is missing or not ADMIN', () => {
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

  it('should block non-admin users from admin routes with 403 Forbidden', async () => {
    // Controlled test app with simulated customer auth context
    const testApp = express();
    testApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'user_customer_test',
        sessionClaims: { metadata: { role: 'CUSTOMER' } },
      });
      next();
    });
    testApp.get('/admin-test', requireAuth, requireRole(UserRole.ADMIN), (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(testApp).get('/admin-test');

    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'Forbidden');
  });

  it('should allow admin users through requireRole(UserRole.ADMIN)', async () => {
    // Controlled test app with simulated admin auth context
    const testApp = express();
    testApp.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: 'user_admin_test',
        sessionClaims: { metadata: { role: 'ADMIN' } },
      });
      next();
    });
    testApp.get('/admin-test', requireAuth, requireRole(UserRole.ADMIN), (_req, res) => {
      res.json({ success: true, authorized: true });
    });

    const response = await request(testApp).get('/admin-test');

    assert.equal(response.status, 200);
    assert.equal(response.body.authorized, true);
  });
});

describe('Database User Synchronization Integration Tests', () => {
  const testClerkId = `test_clerk_${Date.now()}`;

  after(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { clerkUserId: testClerkId },
    });
    await disconnectDb();
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
