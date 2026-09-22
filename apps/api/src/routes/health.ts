import { Router, Request, Response } from 'express';
import { GATIMAAN_VERSION, HealthCheckResponse } from '@gatimaan/shared';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: GATIMAAN_VERSION,
  };

  res.status(200).json(response);
});
