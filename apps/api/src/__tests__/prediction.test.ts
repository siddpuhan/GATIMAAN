import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { DemandLevel, REALTIME_EVENTS, UserRole } from '@gatimaan/shared';
import { createApp } from '../app.js';
import { prisma, disconnectDb } from '../db/client.js';
import { predictionService } from '../services/predictionService.js';
import { eventBus } from '../events/eventBus.js';
import { requireAuth, requireRole, syncUserMiddleware } from '../middleware/auth.js';

describe('Pure TypeScript Prediction Engine & API Integration Tests', () => {
  const app = createApp();
  let testServiceId: string;
  const testSnapshotsToCleanup: string[] = [];

  // Track realtime prediction events
  const capturedPredictionEvents: unknown[] = [];
  const predictionListener = (payload: unknown) => {
    capturedPredictionEvents.push(payload);
  };

  before(async () => {
    eventBus.on(REALTIME_EVENTS.PREDICTION_UPDATED, predictionListener);

    // Fetch or create a test service
    const service = await prisma.service.findFirst({
      where: { isActive: true },
    });
    if (service) {
      testServiceId = service.id;
    }
  });

  after(async () => {
    eventBus.off(REALTIME_EVENTS.PREDICTION_UPDATED, predictionListener);

    // Clean up created prediction snapshots
    if (testSnapshotsToCleanup.length > 0) {
      await prisma.predictionSnapshot.deleteMany({
        where: {
          id: { in: testSnapshotsToCleanup },
        },
      });
    }

    await disconnectDb();
  });

  describe('Statistical Forecasting & Prediction Unit Logic', () => {
    it('should map wait seconds to canonical DemandLevel correctly', () => {
      assert.equal(predictionService.determineDemandLevel(0), DemandLevel.LOW);
      assert.equal(predictionService.determineDemandLevel(300), DemandLevel.LOW);
      assert.equal(predictionService.determineDemandLevel(600), DemandLevel.LOW);
      assert.equal(predictionService.determineDemandLevel(601), DemandLevel.MEDIUM);
      assert.equal(predictionService.determineDemandLevel(1500), DemandLevel.MEDIUM);
      assert.equal(predictionService.determineDemandLevel(1501), DemandLevel.HIGH);
      assert.equal(predictionService.determineDemandLevel(2700), DemandLevel.HIGH);
      assert.equal(predictionService.determineDemandLevel(2701), DemandLevel.SURGE);
      assert.equal(predictionService.determineDemandLevel(5000), DemandLevel.SURGE);
      assert.equal(predictionService.determineDemandLevel(null), DemandLevel.LOW);
      assert.equal(predictionService.determineDemandLevel(undefined), DemandLevel.LOW);
    });

    it('should compute forward-looking wait estimates without NaN or division by zero', () => {
      // 0 counters online (should safely use activeCounters = 1 to prevent divide by zero)
      const noCounters = predictionService.estimateProjectedWaitSeconds({
        waitingCount: 5,
        activeCountersCount: 0,
        effectiveDurationSeconds: 900,
        servingTicketsCount: 0,
        servingWorkloadSeconds: 0,
        forecastedFootfall: 20,
      });
      assert.ok(!Number.isNaN(noCounters));
      assert.ok(Number.isFinite(noCounters));
      assert.ok(noCounters > 0);

      // Empty queue with active counter online -> wait is 0
      const emptyQueue = predictionService.estimateProjectedWaitSeconds({
        waitingCount: 0,
        activeCountersCount: 2,
        effectiveDurationSeconds: 900,
        servingTicketsCount: 0,
        servingWorkloadSeconds: 0,
        forecastedFootfall: 15,
      });
      assert.equal(emptyQueue, 0);

      // Normal queue with 2 active counters
      const normalQueue = predictionService.estimateProjectedWaitSeconds({
        waitingCount: 4,
        activeCountersCount: 2,
        effectiveDurationSeconds: 600,
        servingTicketsCount: 2,
        servingWorkloadSeconds: 600,
        forecastedFootfall: 10,
      });
      assert.ok(normalQueue > 0);
      assert.ok(!Number.isNaN(normalQueue));
    });

    it('should generate deterministic, explainable operational recommendations', () => {
      const recLow = predictionService.generateRecommendation({
        serviceName: 'Aadhaar Update',
        demandLevel: DemandLevel.LOW,
        waitingCount: 1,
        activeCountersCount: 2,
        forecastedFootfall: 10,
      });
      assert.ok(recLow.includes('Normal operating capacity'));

      const recHigh = predictionService.generateRecommendation({
        serviceName: 'Income Certificate',
        demandLevel: DemandLevel.HIGH,
        waitingCount: 8,
        activeCountersCount: 1,
        forecastedFootfall: 30,
      });
      assert.ok(recHigh.includes('recommend opening 1 additional counter'));

      const recSurge = predictionService.generateRecommendation({
        serviceName: 'Caste Certificate',
        demandLevel: DemandLevel.SURGE,
        waitingCount: 20,
        activeCountersCount: 1,
        forecastedFootfall: 50,
      });
      assert.ok(recSurge.includes('Surge capacity threshold reached'));

      const recNoCounters = predictionService.generateRecommendation({
        serviceName: 'Domicile Certificate',
        demandLevel: DemandLevel.LOW,
        waitingCount: 2,
        activeCountersCount: 0,
        forecastedFootfall: 5,
      });
      assert.ok(recNoCounters.includes('No active counters online'));
    });

    it('should forecast next-hour footfall safely on empty or populated history', async () => {
      const forecast = await predictionService.predictNextHourFootfall(testServiceId, new Date());
      assert.ok(typeof forecast === 'number');
      assert.ok(!Number.isNaN(forecast));
      assert.ok(forecast >= 0);
    });
  });

  describe('Prediction REST API & RBAC Integration Tests', () => {
    // Helper to create an admin authenticated supertest app
    function createAdminApp() {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: Request, _res: Response, next) => {
        req.auth = () => ({
          userId: 'test_admin_user_pred',
          sessionClaims: { metadata: { role: 'ADMIN' } },
        });
        next();
      });
      adminApp.use('/', predictionServiceApp());
      return adminApp;
    }

    // Helper to create a customer authenticated supertest app
    function createCustomerApp() {
      const custApp = express();
      custApp.use(express.json());
      custApp.use((req: Request, _res: Response, next) => {
        req.auth = () => ({
          userId: 'test_customer_user_pred',
          sessionClaims: { metadata: { role: 'CUSTOMER' } },
        });
        next();
      });
      custApp.use('/', predictionServiceApp());
      return custApp;
    }

    function predictionServiceApp() {
      const router = express.Router();
      const adminGuard = [requireAuth, requireRole(UserRole.ADMIN), syncUserMiddleware];

      router.get('/api/prediction/current', ...adminGuard, async (_req, res, next) => {
        try {
          const result = await predictionService.getLatestPredictions();
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      });

      router.get('/api/prediction/snapshots', ...adminGuard, async (req, res, next) => {
        try {
          const result = await predictionService.listSnapshots(
            req.query as { date?: string; serviceId?: string }
          );
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      });

      router.post('/api/prediction/recalculate', ...adminGuard, async (_req, res, next) => {
        try {
          const result = await predictionService.recalculateAllPredictions();
          res.status(200).json(result);
        } catch (err) {
          next(err);
        }
      });

      return router;
    }

    it('should reject unauthenticated request to GET /api/prediction/current with 401', async () => {
      const res = await request(app).get('/api/prediction/current');
      assert.equal(res.status, 401);
    });

    it('should reject customer role request to GET /api/prediction/current with 403', async () => {
      const custApp = createCustomerApp();
      const res = await request(custApp).get('/api/prediction/current');
      assert.equal(res.status, 403);
    });

    it('should allow ADMIN to GET /api/prediction/current and return predictions for all active services', async () => {
      const adminApp = createAdminApp();
      const res = await request(adminApp).get('/api/prediction/current');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);

      const first = res.body[0];
      assert.ok(first.serviceId);
      assert.ok(first.serviceName);
      assert.ok(typeof first.predictedWaitSeconds === 'number');
      assert.ok(typeof first.forecastedFootfallNextHour === 'number');
      assert.ok(first.demandLevel in DemandLevel);
      assert.ok(typeof first.recommendation === 'string');
    });

    it('should allow ADMIN to POST /api/prediction/recalculate, persist snapshots, and emit realtime updates', async () => {
      capturedPredictionEvents.length = 0;
      const adminApp = createAdminApp();

      const res = await request(adminApp).post('/api/prediction/recalculate');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.totalServicesProcessed > 0);
      assert.ok(Array.isArray(res.body.predictions));

      // Verify realtime emission over eventBus
      assert.ok(capturedPredictionEvents.length > 0);
      const lastPayload = capturedPredictionEvents[capturedPredictionEvents.length - 1] as {
        serviceId: string;
        predictedWaitSeconds: number;
        demandLevel: DemandLevel;
      };
      assert.ok(lastPayload.serviceId);
      assert.ok(typeof lastPayload.predictedWaitSeconds === 'number');
      assert.ok(lastPayload.demandLevel in DemandLevel);

      // Verify snapshot persistence in database
      const latestSnapshot = await prisma.predictionSnapshot.findFirst({
        orderBy: { timestamp: 'desc' },
      });
      assert.ok(latestSnapshot);
      testSnapshotsToCleanup.push(latestSnapshot.id);
    });

    it('should allow ADMIN to GET /api/prediction/snapshots with date filtering', async () => {
      const adminApp = createAdminApp();
      const todayStr = new Date().toISOString().split('T')[0];

      const res = await request(adminApp).get(`/api/prediction/snapshots?date=${todayStr}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });
  });
});
