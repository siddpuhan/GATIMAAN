import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, GetFootfallQuerySchema } from '@gatimaan/shared';
import { requireAuth, requireRole, syncUserMiddleware } from '../middleware/auth.js';
import { footfallService } from '../services/footfallService.js';

export const footfallRouter = Router();

// Middleware guard: ADMIN role required for internal telemetry
const adminGuard = [requireAuth, requireRole(UserRole.ADMIN), syncUserMiddleware];

/**
 * GET /api/footfall/current
 * Returns real-time occupancy and today's summary metrics.
 */
footfallRouter.get(
  '/api/footfall/current',
  ...adminGuard,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await footfallService.getFootfallSummary();
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/footfall/snapshots
 * Lists historical hourly footfall snapshots for analytics.
 */
footfallRouter.get(
  '/api/footfall/snapshots',
  ...adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = GetFootfallQuerySchema.parse(req.query);
      const snapshots = await footfallService.listSnapshots(query.date);
      res.status(200).json(snapshots);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/footfall/snapshots/generate
 * Triggers on-demand generation of an hourly snapshot.
 */
footfallRouter.post(
  '/api/footfall/snapshots/generate',
  ...adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetDate = req.body.date ? new Date(req.body.date) : new Date();
      const snapshot = await footfallService.generateSnapshot(targetDate);
      res.status(201).json(snapshot);
    } catch (err) {
      next(err);
    }
  }
);
