import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

/**
 * Prisma CLI configuration.
 * SQLite is accessed through the libSQL driver adapter, so no native Rust engines have to be downloaded.
 * The DATABASE_URL (file:./prisma/dev.db) is resolved relative to the backend/ directory.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  experimental: { adapter: true },
  engine: 'js',
  async adapter() {
    return new PrismaLibSQL({ url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' });
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
});
