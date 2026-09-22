import { Router, Request, Response } from 'express';
import { UserRole } from '@gatimaan/shared';
import { requireAuth, requireRole, syncUserMiddleware, getAuthContext } from '../middleware/auth.js';

export const authRouter = Router();

// GET /api/auth/me - Retrieve current authenticated profile & local synced database record
authRouter.get('/api/auth/me', requireAuth, syncUserMiddleware, (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  res.status(200).json({
    authenticated: true,
    user: req.user,
    clerkUserId: auth?.userId,
  });
});

// POST /api/auth/sync - Explicitly synchronize Clerk identity with local database
authRouter.post(
  '/api/auth/sync',
  requireAuth,
  syncUserMiddleware,
  (req: Request, res: Response) => {
    res.status(200).json({
      synchronized: true,
      user: req.user,
    });
  }
);

// GET /api/admin/status - Protected admin-only diagnostic endpoint
authRouter.get(
  '/api/admin/status',
  requireAuth,
  requireRole(UserRole.ADMIN),
  syncUserMiddleware,
  (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      adminUser: req.user,
      authorized: true,
      timestamp: new Date().toISOString(),
    });
  }
);
