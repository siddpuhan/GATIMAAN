import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { DeviceDTO, DeviceType } from '@gatimaan/shared';
import { prisma } from '../db/client.js';

// Extend Express Request interface to include authenticated IoT device context
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      device?: DeviceDTO;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Computes SHA-256 hex digest of a raw secret key.
 */
export function hashDeviceKey(rawSecret: string): string {
  return crypto.createHash('sha256').update(rawSecret).digest('hex');
}

/**
 * Middleware: Authenticates IoT Hardware devices (ESP32 Gate controller, Kiosk, etc.)
 * Validates `x-device-id` and `x-device-key` against the PostgreSQL `devices` table via SHA-256 keyHash.
 * Updates device `lastSeenAt` timestamp upon successful validation.
 */
export async function requireDeviceAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const deviceIdHeader = req.headers['x-device-id'];
  const deviceKeyHeader = req.headers['x-device-key'];

  const deviceId = Array.isArray(deviceIdHeader) ? deviceIdHeader[0] : deviceIdHeader;
  const rawKey = Array.isArray(deviceKeyHeader) ? deviceKeyHeader[0] : deviceKeyHeader;

  if (!deviceId || !rawKey || !deviceId.trim() || !rawKey.trim()) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing device authentication headers (x-device-id, x-device-key)',
    });
    return;
  }

  try {
    const cleanDeviceId = deviceId.trim();
    const cleanKey = rawKey.trim();
    const computedKeyHash = hashDeviceKey(cleanKey);

    const device = await prisma.device.findUnique({
      where: { deviceId: cleanDeviceId },
    });

    if (!device || device.keyHash !== computedKeyHash) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid device credentials',
      });
      return;
    }

    if (!device.isActive) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Device is deactivated',
      });
      return;
    }

    // Update lastSeenAt timestamp asynchronously
    const now = new Date();
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: now },
    });

    req.device = {
      id: device.id,
      deviceId: device.deviceId,
      deviceType: device.deviceType as DeviceType,
      name: device.name,
      location: device.location,
      isActive: device.isActive,
      lastSeenAt: now,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };

    next();
  } catch (err) {
    next(err);
  }
}
