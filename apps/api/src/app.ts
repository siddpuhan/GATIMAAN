import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Basic middleware
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/', healthRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
