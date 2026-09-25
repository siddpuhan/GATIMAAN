import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, GetPredictionQuerySchema } from '@gatimaan/shared';
import { requireAuth, requireRole, syncUserMiddleware } from '../middleware/auth.js';
import { predictionService } from '../services/predictionService.js';

export const predictionRouter = Router();

// Middleware guard: ADMIN role required for prediction analytics and recalibrations
const adminGuard = [requireAuth, requireRole(UserRole.ADMIN), syncUserMiddleware];

/**
 * GET /api/prediction/current
 * Returns the latest queue prediction, forecasted footfall, and recommendations for all active services.
 */
predictionRouter.get(
  '/api/prediction/current',
  ...adminGuard,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const predictions = await predictionService.getLatestPredictions();
      res.status(200).json(predictions);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/prediction/snapshots
 * Returns historical prediction snapshots with optional date / service filtering.
 */
predictionRouter.get(
  '/api/prediction/snapshots',
  ...adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = GetPredictionQuerySchema.parse(req.query);
      const snapshots = await predictionService.listSnapshots(query);
      res.status(200).json(snapshots);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/prediction/recalculate
 * Triggers an on-demand re-forecast for all services, creates persistent snapshots,
 * and broadcasts update events to the Socket.IO prediction room.
 */
predictionRouter.post(
  '/api/prediction/recalculate',
  ...adminGuard,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await predictionService.recalculateAllPredictions();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
