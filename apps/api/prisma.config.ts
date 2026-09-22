import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: '.env' });

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    directory: './prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL || process.env.DIRECT_URL,
  },
});
