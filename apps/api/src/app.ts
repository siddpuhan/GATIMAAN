import express, { Express } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { config } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { servicesRouter } from './routes/services.js';
import { countersRouter } from './routes/counters.js';
import { ticketsRouter } from './routes/tickets.js';
import { iotRouter } from './routes/iot.js';
import { footfallRouter } from './routes/footfall.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Basic middleware
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Clerk authentication middleware (applied when CLERK_SECRET_KEY is configured)
  if (config.clerkSecretKey) {
    app.use(clerkMiddleware({ secretKey: config.clerkSecretKey }));
  } else {
    // Development/test fallback: ensure req.auth structure is defined as function
    app.use((req, _res, next) => {
      if (!req.auth) {
        req.auth = () => ({ userId: null, sessionId: null, claims: null, sessionClaims: null });
      }
      next();
    });
  }

  // Routes
  app.use('/', healthRouter);
  app.use('/', authRouter);
  app.use('/', servicesRouter);
  app.use('/', countersRouter);
  app.use('/', ticketsRouter);
  app.use('/', iotRouter);
  app.use('/', footfallRouter);


  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
