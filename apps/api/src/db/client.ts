import { PrismaClient } from '../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from '../config/env.js';

const connectionString = config.databaseUrl || process.env.DATABASE_URL;

declare global {
  var __pgPool: pg.Pool | undefined;
  var __prismaClient: PrismaClient | undefined;
}

let pool: pg.Pool;

if (globalThis.__pgPool) {
  pool = globalThis.__pgPool;
} else {
  pool = new pg.Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: false,
  });

  pool.on('error', (err) => {
    // Catch idle client drops so pool silently purges dead connections
    console.warn('[pg.Pool] Idle database client error/closed (pool will reconnect on next query):', err.message);
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__pgPool = pool;
  }
}

let prisma: PrismaClient;

if (globalThis.__prismaClient) {
  prisma = globalThis.__prismaClient;
} else {
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({
    adapter,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prismaClient = prisma;
  }
}

export { prisma, pool };

export async function connectDb(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  globalThis.__pgPool = undefined;
  globalThis.__prismaClient = undefined;
}

export * from '../generated/client/client.js';
