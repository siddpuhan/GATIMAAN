import { Router, Request, Response, NextFunction } from 'express';
import {
  UserRole,
  CreateCounterSchema,
  UpdateCounterSchema,
  CounterStatusSchema,
} from '@gatimaan/shared';
import { requireAuth, requireRole, syncUserMiddleware } from '../middleware/auth.js';
import { countersService } from '../services/countersService.js';
import { BadRequestError } from '../errors/appErrors.js';

export const countersRouter = Router();

// Middleware guard applied to all counters routes: ADMIN only
const adminGuard = [requireAuth, requireRole(UserRole.ADMIN), syncUserMiddleware];

// GET /api/counters - List all counters with session status
countersRouter.get('/api/counters', ...adminGuard, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const counters = await countersService.listCounters();
    res.status(200).json(counters);
  } catch (err) {
    next(err);
  }
});

// GET /api/counters/:id - Get a single counter by ID
countersRouter.get('/api/counters/:id', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const counter = await countersService.getCounterById(id);
    res.status(200).json(counter);
  } catch (err) {
    next(err);
  }
});

// POST /api/counters - Create a new counter
countersRouter.post('/api/counters', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateCounterSchema.parse(req.body);
    const created = await countersService.createCounter(validatedData);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/counters/:id - Update counter details
countersRouter.patch('/api/counters/:id', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validatedData = UpdateCounterSchema.parse(req.body);
    const updated = await countersService.updateCounter(id, validatedData);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/counters/:id/status - Toggle/update counter active status
countersRouter.patch('/api/counters/:id/status', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validatedData = CounterStatusSchema.parse(req.body);
    const updated = await countersService.setCounterStatus(id, validatedData.isActive);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/counters/:id/open - Open desk session for counter
countersRouter.post('/api/counters/:id/open', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('User context required to open a counter session');
    }

    const session = await countersService.openCounterSession(id, userId);
    res.status(200).json({
      message: 'Counter opened successfully',
      session,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/counters/:id/close - Close active desk session for counter
countersRouter.post('/api/counters/:id/close', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const session = await countersService.closeCounterSession(id);
    res.status(200).json({
      message: 'Counter closed successfully',
      session,
    });
  } catch (err) {
    next(err);
  }
});
