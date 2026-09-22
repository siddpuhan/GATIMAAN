import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
} as const;
