import { Router, Request, Response, NextFunction } from 'express';
import { IngestFootfallSchema, BatchIngestFootfallSchema } from '@gatimaan/shared';
import { requireDeviceAuth } from '../middleware/deviceAuth.js';
import { footfallService } from '../services/footfallService.js';

export const iotRouter = Router();

/**
 * POST /api/iot/footfall
 * Ingests a single footfall event from an authorized IoT device.
 */
iotRouter.post(
  '/api/iot/footfall',
  requireDeviceAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = IngestFootfallSchema.parse(req.body);
      const result = await footfallService.ingestEvent(req.device!, validatedData);
      const statusCode = result.isDuplicate ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/iot/footfall/batch
 * Ingests a batch of offline-buffered footfall events from an authorized IoT device.
 */
iotRouter.post(
  '/api/iot/footfall/batch',
  requireDeviceAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = BatchIngestFootfallSchema.parse(req.body);
      const result = await footfallService.ingestBatch(req.device!, validatedData);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
