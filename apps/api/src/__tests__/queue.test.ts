import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { createApp } from '../app.js';
import { ticketsRouter } from '../routes/tickets.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { prisma } from '../db/client.js';

describe('Queue Engine & Ticket Lifecycle Integration Tests', () => {
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  const activeServiceCode = `QACT${randomSuffix}`;
  const inactiveServiceCode = `QINA${randomSuffix}`;
  const counterNumber1 = 70000 + (randomSuffix % 4000);
  const counterNumber2 = 75000 + (randomSuffix % 4000);

  const adminClerkId1 = `test_admin_q1_${randomSuffix}`;
  const adminEmail1 = `admin_q1_${randomSuffix}@test.local`;
  const adminClerkId2 = `test_admin_q2_${randomSuffix}`;
  const adminEmail2 = `admin_q2_${randomSuffix}@test.local`;
  const custClerkId = `test_cust_q_${randomSuffix}`;
  const custEmail = `cust_q_${randomSuffix}@test.local`;

  let activeServiceId: string;
  let inactiveServiceId: string;
  let counterId1: string;
  let counterId2: string;
  let adminUserId1: string;
  let adminUserId2: string;

  function createAdminApp(operatorClerkId = adminClerkId1, operatorEmail = adminEmail1) {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: operatorClerkId,
        sessionClaims: {
          email: operatorEmail,
          name: `Admin Operator ${operatorClerkId}`,
          metadata: { role: 'ADMIN' },
        },
      });
      next();
    });
    app.use('/', ticketsRouter);
    app.use(errorHandler);
    return app;
  }

  function createCustomerApp() {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next) => {
      req.auth = () => ({
        userId: custClerkId,
        sessionClaims: {
          email: custEmail,
          metadata: { role: 'CUSTOMER' },
        },
      });
      next();
    });
    app.use('/', ticketsRouter);
    app.use(errorHandler);
    return app;
  }

  before(async () => {
    // 1. Create active test service
    const activeSvc = await prisma.service.create({
      data: {
        code: activeServiceCode,
        name: `Active Test Queue Service ${randomSuffix}`,
        prefix: `Q${randomSuffix.toString().slice(0, 2)}`,
        avgDurationMinutes: 10,
        priority: 1,
        isActive: true,
      },
    });
    activeServiceId = activeSvc.id;

    // 2. Create inactive test service
    const inactSvc = await prisma.service.create({
      data: {
        code: inactiveServiceCode,
        name: `Inactive Test Queue Service ${randomSuffix}`,
        prefix: `QI`,
        avgDurationMinutes: 10,
        priority: 1,
        isActive: false,
      },
    });
    inactiveServiceId = inactSvc.id;

    // 3. Create test counters
    const c1 = await prisma.counter.create({
      data: {
        counterNumber: counterNumber1,
        name: `Queue Desk 1 - ${randomSuffix}`,
        isActive: true,
      },
    });
    counterId1 = c1.id;

    const c2 = await prisma.counter.create({
      data: {
        counterNumber: counterNumber2,
        name: `Queue Desk 2 - ${randomSuffix}`,
        isActive: true,
      },
    });
    counterId2 = c2.id;

    // 4. Ensure admin users exist in local DB
    const adminUser1 = await prisma.user.upsert({
      where: { clerkUserId: adminClerkId1 },
      update: { role: 'ADMIN', email: adminEmail1 },
      create: {
        clerkUserId: adminClerkId1,
        email: adminEmail1,
        name: 'Admin Operator 1',
        role: 'ADMIN',
      },
    });
    adminUserId1 = adminUser1.id;

    const adminUser2 = await prisma.user.upsert({
      where: { clerkUserId: adminClerkId2 },
      update: { role: 'ADMIN', email: adminEmail2 },
      create: {
        clerkUserId: adminClerkId2,
        email: adminEmail2,
        name: 'Admin Operator 2',
        role: 'ADMIN',
      },
    });
    adminUserId2 = adminUser2.id;
  });

  after(async () => {
    // Clean up tickets
    await prisma.ticket.deleteMany({
      where: {
        serviceId: { in: [activeServiceId, inactiveServiceId] },
      },
    });

    // Clean up counter sessions
    await prisma.counterSession.deleteMany({
      where: {
        counterId: { in: [counterId1, counterId2] },
      },
    });

    // Clean up counters
    await prisma.counter.deleteMany({
      where: { id: { in: [counterId1, counterId2] } },
    });

    // Clean up services
    await prisma.service.deleteMany({
      where: { id: { in: [activeServiceId, inactiveServiceId] } },
    });

    // Clean up test users
    await prisma.user.deleteMany({
      where: { clerkUserId: { in: [adminClerkId1, adminClerkId2, custClerkId] } },
    });
  });

  describe('Ticket Issuance (POST /api/tickets/issue)', () => {
    it('should reject ticket issuance for nonexistent service with 404', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: '00000000-0000-0000-0000-000000000000' });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'NotFoundError');
    });

    it('should reject ticket issuance for inactive service with 400', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: inactiveServiceId });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'BadRequestError');
    });

    it('should issue first ticket sequentially with prefix and 001', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId });

      assert.equal(res.status, 201);
      assert.ok(res.body.id);
      assert.equal(res.body.serviceId, activeServiceId);
      assert.equal(res.body.status, 'WAITING');
      assert.ok(res.body.ticketNumber.endsWith('001'));
    });

    it('should issue second ticket sequentially with prefix and 002', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId });

      assert.equal(res.status, 201);
      assert.ok(res.body.ticketNumber.endsWith('002'));
    });

    it('should issue tickets concurrently without duplicate numbers or collisions', async () => {
      const app = createApp();
      const promises = [
        request(app).post('/api/tickets/issue').send({ serviceId: activeServiceId }),
        request(app).post('/api/tickets/issue').send({ serviceId: activeServiceId }),
        request(app).post('/api/tickets/issue').send({ serviceId: activeServiceId }),
      ];

      const responses = await Promise.all(promises);
      const ticketNumbers = responses.map((r) => {
        assert.equal(r.status, 201);
        return r.body.ticketNumber;
      });

      // Ensure all 3 ticket numbers are completely distinct
      const uniqueNumbers = new Set(ticketNumbers);
      assert.equal(uniqueNumbers.size, 3);
    });
  });

  describe('Queue Position & Status (GET /api/tickets/:id/position)', () => {
    let ticket1Id: string;
    let ticket2Id: string;
    let priorityTicketId: string;

    before(async () => {
      // Clear tickets for clean position calculation
      await prisma.ticket.deleteMany({
        where: { serviceId: activeServiceId },
      });

      const app = createApp();
      const t1 = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId, priority: 1 });
      ticket1Id = t1.body.id;

      const t2 = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId, priority: 1 });
      ticket2Id = t2.body.id;

      // Higher priority ticket issued later
      const tPriority = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId, priority: 5 });
      priorityTicketId = tPriority.body.id;
    });

    it('should calculate correct position taking priority rank into account', async () => {
      const app = createApp();

      // Priority 5 ticket should jump ahead of priority 1 tickets
      const resPriority = await request(app).get(`/api/tickets/${priorityTicketId}/position`);
      assert.equal(resPriority.status, 200);
      assert.equal(resPriority.body.position, 1);
      assert.equal(resPriority.body.aheadCount, 0);

      // Ticket 1 (priority 1, created earlier) is position 2
      const resT1 = await request(app).get(`/api/tickets/${ticket1Id}/position`);
      assert.equal(resT1.status, 200);
      assert.equal(resT1.body.position, 2);
      assert.equal(resT1.body.aheadCount, 1);

      // Ticket 2 (priority 1, created later) is position 3
      const resT2 = await request(app).get(`/api/tickets/${ticket2Id}/position`);
      assert.equal(resT2.status, 200);
      assert.equal(resT2.body.position, 3);
      assert.equal(resT2.body.aheadCount, 2);
    });
  });

  describe('Desk Operations Authorization', () => {
    it('should reject unauthenticated request to POST /api/tickets/call-next with 401', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/tickets/call-next')
        .send({ counterId: counterId1 });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });

    it('should reject CUSTOMER role from POST /api/tickets/call-next with 403', async () => {
      const customerApp = createCustomerApp();
      const res = await request(customerApp)
        .post('/api/tickets/call-next')
        .send({ counterId: counterId1 });

      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'Forbidden');
    });

    it('should reject call-next if ADMIN does not have active CounterSession on counter', async () => {
      const adminApp = createAdminApp(adminClerkId1, adminEmail1);
      const res = await request(adminApp)
        .post('/api/tickets/call-next')
        .send({ counterId: counterId1 });

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'ConflictError');
      assert.ok(res.body.message.includes('does not have an active session'));
    });
  });

  describe('Full Desk Calling Lifecycle & State Machine', () => {
    let lifecycleTicketId: string;

    before(async () => {
      // Clear tickets
      await prisma.ticket.deleteMany({
        where: { serviceId: activeServiceId },
      });

      // Open counter session for Operator 1 on Counter 1
      await prisma.counterSession.create({
        data: {
          counterId: counterId1,
          userId: adminUserId1,
          isActive: true,
          openedAt: new Date(),
        },
      });

      // Issue a waiting ticket
      const app = createApp();
      const res = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId });
      lifecycleTicketId = res.body.id;
    });

    it('should allow active operator to call next ticket (WAITING -> CALLED)', async () => {
      const adminApp = createAdminApp(adminClerkId1, adminEmail1);
      const res = await request(adminApp)
        .post('/api/tickets/call-next')
        .send({ counterId: counterId1, serviceId: activeServiceId });

      assert.equal(res.status, 200);
      assert.ok(res.body.ticket);
      assert.equal(res.body.ticket.id, lifecycleTicketId);
      assert.equal(res.body.ticket.status, 'CALLED');
      assert.equal(res.body.ticket.counterId, counterId1);
      assert.ok(res.body.ticket.calledAt);
    });

    it('should reject calling next ticket while counter already has active CALLED ticket', async () => {
      const adminApp = createAdminApp(adminClerkId1, adminEmail1);
      const res = await request(adminApp)
        .post('/api/tickets/call-next')
        .send({ counterId: counterId1, serviceId: activeServiceId });

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'ConflictError');
      assert.ok(res.body.message.includes('already has an active ticket'));
    });

    it('should reject completing a ticket that is in CALLED state (invalid transition)', async () => {
      const adminApp = createAdminApp(adminClerkId1, adminEmail1);
      const res = await request(adminApp)
        .post(`/api/tickets/${lifecycleTicketId}/complete`)
        .send({ counterId: counterId1 });

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'ConflictError');
      assert.ok(res.body.message.includes('Must be \'SERVING\''));
    });

    it('should start serving the called ticket (CALLED -> SERVING)', async () => {
      const adminApp = createAdminApp(adminClerkId1, adminEmail1);
      const res = await request(adminApp)
        .post(`/api/tickets/${lifecycleTicketId}/serve`)
        .send({ counterId: counterId1 });

      assert.equal(res.status, 200);
      assert.equal(res.body.ticket.status, 'SERVING');
      assert.ok(res.body.ticket.servedAt);
    });

    it('should reject wrong counter from serving/completing ticket', async () => {
      // Open session on Counter 2 for Operator 2
      await prisma.counterSession.create({
        data: {
          counterId: counterId2,
          userId: adminUserId2,
          isActive: true,
          openedAt: new Date(),
        },
      });

      const adminApp2 = createAdminApp(adminClerkId2, adminEmail2);
      const res = await request(adminApp2)
        .post(`/api/tickets/${lifecycleTicketId}/complete`)
        .send({ counterId: counterId2 });

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'ConflictError');
      assert.ok(res.body.message.includes('assigned to another counter'));
    });

    it('should complete the serving ticket (SERVING -> COMPLETED)', async () => {
      const adminApp = createAdminApp(adminClerkId1, adminEmail1);
      const res = await request(adminApp)
        .post(`/api/tickets/${lifecycleTicketId}/complete`)
        .send({ counterId: counterId1 });

      assert.equal(res.status, 200);
      assert.equal(res.body.ticket.status, 'COMPLETED');
      assert.ok(res.body.ticket.completedAt);
    });

    it('should return position 0 for completed ticket', async () => {
      const app = createApp();
      const res = await request(app).get(`/api/tickets/${lifecycleTicketId}/position`);
      assert.equal(res.status, 200);
      assert.equal(res.body.position, 0);
      assert.equal(res.body.aheadCount, 0);
      assert.equal(res.body.status, 'COMPLETED');
    });
  });

  describe('Skip / No-Show & Ticket Cancellation', () => {
    it('should allow skipping a CALLED ticket (CALLED -> NO_SHOW)', async () => {
      const app = createApp();

      // Clear tickets for clean test state
      await prisma.ticket.deleteMany({
        where: { serviceId: activeServiceId },
      });

      await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId });

      const adminApp = createAdminApp(adminClerkId1, adminEmail1);
      const callRes = await request(adminApp)
        .post('/api/tickets/call-next')
        .send({ counterId: counterId1, serviceId: activeServiceId });

      assert.equal(callRes.status, 200, `Call Next Error: ${JSON.stringify(callRes.body)}`);
      assert.ok(callRes.body.ticket);
      const ticketIdToSkip = callRes.body.ticket.id;

      const skipRes = await request(adminApp)
        .post(`/api/tickets/${ticketIdToSkip}/skip`)
        .send({ counterId: counterId1 });

      assert.equal(skipRes.status, 200, `Skip Error: ${JSON.stringify(skipRes.body)}`);
      assert.equal(skipRes.body.ticket.status, 'NO_SHOW');
    });

    it('should allow cancelling a WAITING ticket (WAITING -> CANCELLED)', async () => {
      const app = createApp();
      const t = await request(app)
        .post('/api/tickets/issue')
        .send({ serviceId: activeServiceId });

      const cancelRes = await request(app)
        .post(`/api/tickets/${t.body.id}/cancel`);

      assert.equal(cancelRes.status, 200, `Cancel Error: ${JSON.stringify(cancelRes.body)}`);
      assert.equal(cancelRes.body.ticket.status, 'CANCELLED');
      assert.ok(cancelRes.body.ticket.cancelledAt);
    });
  });

  describe('High-Concurrency Call-Next Protection (FOR UPDATE SKIP LOCKED)', () => {
    it('should ensure two concurrent call-next requests dequeue distinct tickets', async () => {
      const app = createApp();

      // Clear tickets
      await prisma.ticket.deleteMany({
        where: { serviceId: activeServiceId },
      });

      // Issue 2 tickets
      const t1 = await request(app).post('/api/tickets/issue').send({ serviceId: activeServiceId });
      const t2 = await request(app).post('/api/tickets/issue').send({ serviceId: activeServiceId });

      assert.equal(t1.status, 201);
      assert.equal(t2.status, 201);

      // Concurrent call-next from Operator 1 (Counter 1) and Operator 2 (Counter 2)
      const adminApp1 = createAdminApp(adminClerkId1, adminEmail1);
      const adminApp2 = createAdminApp(adminClerkId2, adminEmail2);

      const [res1, res2] = await Promise.all([
        request(adminApp1).post('/api/tickets/call-next').send({ counterId: counterId1, serviceId: activeServiceId }),
        request(adminApp2).post('/api/tickets/call-next').send({ counterId: counterId2, serviceId: activeServiceId }),
      ]);

      assert.equal(res1.status, 200, `Concurrency Res1 Error: ${JSON.stringify(res1.body)}`);
      assert.equal(res2.status, 200, `Concurrency Res2 Error: ${JSON.stringify(res2.body)}`);
      assert.ok(res1.body.ticket);
      assert.ok(res2.body.ticket);

      // Verify they got completely distinct tickets
      assert.notEqual(res1.body.ticket.id, res2.body.ticket.id);
      assert.notEqual(res1.body.ticket.ticketNumber, res2.body.ticket.ticketNumber);

      // Verify counters match respective operator requests
      assert.equal(res1.body.ticket.counterId, counterId1);
      assert.equal(res2.body.ticket.counterId, counterId2);
    });
  });
});
