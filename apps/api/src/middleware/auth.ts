import { Request, Response, NextFunction } from 'express';
import { UserRole, AuthUser } from '@gatimaan/shared';
import { prisma } from '../db/client.js';

// Extend Express Request interface to include authenticated user context
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId?: string | null;
        sessionId?: string | null;
        sessionClaims?: Record<string, unknown> | null;
        claims?: Record<string, unknown> | null;
      };
      user?: AuthUser;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Safely extracts the authoritative role from Clerk verified session claims.
 * Clerk publicMetadata.role is the source of truth. Defaults to CUSTOMER.
 */
export function extractRoleFromAuth(auth?: Request['auth']): UserRole {
  if (!auth) {
    return UserRole.CUSTOMER;
  }

  const claims = (auth.sessionClaims || auth.claims) as Record<string, unknown> | undefined | null;

  const metadata = claims?.metadata as Record<string, unknown> | undefined;
  const publicMetadata = claims?.publicMetadata as Record<string, unknown> | undefined;

  const rawRole =
    (metadata?.role as string | undefined) ||
    (publicMetadata?.role as string | undefined) ||
    (claims?.role as string | undefined);

  if (typeof rawRole === 'string' && rawRole.toUpperCase() === UserRole.ADMIN) {
    return UserRole.ADMIN;
  }

  return UserRole.CUSTOMER;
}

/**
 * Middleware: Requires a valid authenticated Clerk session.
 * Returns HTTP 401 if unauthenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please provide a valid session token.',
    });
    return;
  }

  next();
}

/**
 * Middleware: Requires the authenticated user to possess an allowed role.
 * Returns HTTP 403 if the user lacks the required role.
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    const currentRole = extractRoleFromAuth(req.auth);

    if (!roles.includes(currentRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: [${roles.join(', ')}], Current role: ${currentRole}`,
      });
      return;
    }

    next();
  };
}

/**
 * Synchronizes the verified Clerk user identity with the local PostgreSQL `users` table.
 * Authoritative role and identity come directly from Clerk claims.
 */
export async function syncUserRecord(auth: NonNullable<Request['auth']>): Promise<AuthUser> {
  const clerkUserId = auth.userId;
  if (!clerkUserId) {
    throw new Error('Cannot sync user without a valid clerkUserId');
  }

  const claims = auth.sessionClaims || auth.claims;
  const email =
    (claims?.email as string) ||
    (claims?.primary_email_address as string) ||
    (claims?.email_address as string) ||
    `${clerkUserId}@clerk.user`;

  const name =
    (claims?.name as string) ||
    (claims?.full_name as string) ||
    (claims?.first_name ? `${claims.first_name} ${claims.last_name || ''}`.trim() : null);

  const authoritativeRole = extractRoleFromAuth(auth);

  const localUser = await prisma.user.upsert({
    where: { clerkUserId },
    update: {
      email,
      name,
      role: authoritativeRole,
    },
    create: {
      clerkUserId,
      email,
      name,
      role: authoritativeRole,
    },
  });

  return {
    id: localUser.id,
    clerkUserId: localUser.clerkUserId!,
    email: localUser.email,
    name: localUser.name,
    phone: localUser.phone,
    role: localUser.role as UserRole,
    createdAt: localUser.createdAt,
    updatedAt: localUser.updatedAt,
  };
}

/**
 * Middleware: Lazily synchronizes the authenticated user to PostgreSQL and attaches req.user.
 */
export async function syncUserMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.auth?.userId) {
    next();
    return;
  }

  try {
    req.user = await syncUserRecord(req.auth);
    next();
  } catch (error) {
    console.error('[Auth Sync Error]:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to synchronize local user identity.',
    });
  }
}
