import { Router, Request, Response, NextFunction } from 'express';
import {
  UserRole,
  CreateServiceSchema,
  UpdateServiceSchema,
  ServiceStatusSchema,
} from '@gatimaan/shared';
import { requireAuth, requireRole, syncUserMiddleware } from '../middleware/auth.js';
import { servicesService } from '../services/servicesService.js';

export const servicesRouter = Router();

// Middleware guard applied to all services routes: ADMIN only
const adminGuard = [requireAuth, requireRole(UserRole.ADMIN), syncUserMiddleware];

// GET /api/services - List services (public returns active only, admin can include inactive)
servicesRouter.get('/api/services', syncUserMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth ? (typeof req.auth === 'function' ? req.auth() : req.auth) : undefined;
    const role = (req.user?.role as string | undefined) || (auth?.sessionClaims?.metadata as { role?: string })?.role || (auth?.sessionClaims?.publicMetadata as { role?: string })?.role;
    const isAdmin = role?.toUpperCase() === UserRole.ADMIN;

    // Non-admins can only see active services
    const includeInactive = isAdmin ? req.query.includeInactive !== 'false' : false;
    const services = await servicesService.listServices(includeInactive);
    res.status(200).json(services);
  } catch (err) {
    next(err);
  }
});

// GET /api/services/:id - Get a single service (public/customer readable)
servicesRouter.get('/api/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const service = await servicesService.getServiceById(id);
    res.status(200).json(service);
  } catch (err) {
    next(err);
  }
});

// POST /api/services - Create a new service
servicesRouter.post('/api/services', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateServiceSchema.parse(req.body);
    const created = await servicesService.createService(validatedData);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/services/:id - Update service details
servicesRouter.patch('/api/services/:id', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validatedData = UpdateServiceSchema.parse(req.body);
    const updated = await servicesService.updateService(id, validatedData);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/services/:id/status - Toggle/update service active status
servicesRouter.patch('/api/services/:id/status', ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validatedData = ServiceStatusSchema.parse(req.body);
    const updated = await servicesService.setServiceStatus(id, validatedData.isActive);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});
