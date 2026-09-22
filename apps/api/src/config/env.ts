import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

function parseCorsOrigins(raw?: string): string[] {
  if (!raw) {
    return ['http://localhost:5173'];
  }
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return origins.length > 0 ? origins : ['http://localhost:5173'];
}

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
} as const;

